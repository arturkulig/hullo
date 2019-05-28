import {
  Observable,
  Subscription,
  Observer,
  ComplexProducer,
  Cancellation
} from "./Observable";
import { map } from "./operators/map";
import { of } from "./of";

export function combineLatest<T extends any[]>(
  streams: CombineLatestArgument<T>
): Observable<T> {
  if (streams.length === 0) {
    return of([([] as unknown) as T]);
  }
  if (streams.length === 1) {
    return streams[0].pipe(map<T[keyof T], T>(singleToArrayOfOne));
  }
  return new Observable<T>(new CombineLatestProducer(streams));
}

function singleToArrayOfOne<T extends any[]>(v: T[keyof T]) {
  return [v] as T;
}

class CombineLatestProducer<T extends any[]> implements ComplexProducer<T> {
  constructor(private streams: CombineLatestArgument<T>) {}

  subscribe(observer: Observer<T>) {
    const context: CombineLatestContext<T> = {
      closed: false,
      streams: this.streams,
      subs: [],
      everyOk: this.streams.map(() => false),
      allOk: false,
      values: ([] as unknown) as T,
      frame: undefined,
      observer
    };

    for (let i = 0, l = context.streams.length; i < l; i++) {
      context.subs[i] = context.streams[i].subscribe(
        new CombineLatestEntryObserver<T>(context, i)
      );
    }

    return new CombineLatestCancel(context);
  }
}

class CombineLatestCancel<T extends any[]> implements Cancellation {
  constructor(private context: CombineLatestContext<T>) {}

  cancel() {
    this.context.closed = true;
    for (let i = 0, l = this.context.subs.length; i < l; i++) {
      if (!this.context.subs[i].closed) {
        this.context.subs[i].cancel();
      }
    }
  }
}

class CombineLatestEntryObserver<T extends any[]>
  implements Observer<T[keyof T]> {
  get closed() {
    return this._context.closed;
  }

  constructor(
    private _context: CombineLatestContext<T>,
    private _position: number
  ) {}

  next(value: T[keyof T]) {
    if (this._context.closed) {
      return Promise.resolve();
    }

    if (this._context.frame && this._context.frame.completion) {
      const frame = this._context.frame;
      return new Promise<void>(r => frameDeliveryProducer(frame, r));
    }

    const values = this._context.values.slice(0) as T;
    values[this._position] = value;
    const frame: Frame<T> = {
      sent: false,
      completion: false,
      values,
      merged: this._context.frame
    };
    this._context.frame = frame;
    this._context.values = values;

    if (!this._context.allOk) {
      if (!this._context.everyOk[this._position]) {
        this._context.everyOk[this._position] = true;

        this._context.allOk = true;
        for (let i = 0, l = this._context.everyOk.length; i < l; i++) {
          if (!this._context.everyOk[i]) {
            this._context.allOk = false;
            break;
          }
        }
      }
    }

    if (this._context.allOk) {
      Promise.resolve(this._context).then(send);
    }

    return new Promise<void>(r => frameDeliveryProducer(frame, r));
  }

  complete() {
    if (this._context.closed) {
      return Promise.resolve();
    }

    if (this._context.frame && this._context.frame.completion) {
      const frame = this._context.frame;
      return new Promise<void>(r => frameDeliveryProducer(frame, r));
    }

    const frame: Frame<T> = {
      sent: false,
      completion: true,
      values: this._context.values,
      merged: this._context.frame
    };
    this._context.frame = frame;

    Promise.resolve(this._context).then(send);

    for (let i = 0, l = this._context.subs.length; i < l; i++) {
      if (i !== this._position && !this._context.subs[i].closed) {
        this._context.subs[i].cancel();
      }
    }

    return new Promise<void>(r => frameDeliveryProducer(frame, r));
  }
}

function send<T extends any[]>(context: CombineLatestContext<T>) {
  if (context.closed || !context.frame || !context.observer) {
    return;
  }
  const frame = context.frame;
  context.frame = undefined;

  if (frame.completion) {
    context.closed = true;
  }

  (frame.completion
    ? context.observer.complete()
    : context.observer.next(frame.values)
  ).then(() => frameDeliveryConfirmations(frame));
}

function frameDeliveryProducer<T extends any[]>(
  frame: Frame<T>,
  resolve: (v: void) => any
) {
  if (frame.sent) {
    resolve();
  } else {
    if (frame.acks) {
      frame.acks.push(resolve);
    } else {
      frame.acks = [resolve];
    }
  }
}

function frameDeliveryConfirmations<T extends any[]>(frame: Frame<T>) {
  let innerFrame: Frame<T> | undefined = frame;
  while (innerFrame) {
    innerFrame.sent = true;
    for (
      let i = 0, l = innerFrame.acks ? innerFrame.acks.length : 0;
      i < l;
      i += 1
    ) {
      innerFrame.acks![i]();
    }
    innerFrame = innerFrame.merged;
  }
}

type CombineLatestArgument<T extends any[]> = {
  [idx in keyof T]: Observable<T[idx]>
};

interface Frame<T extends any[]> {
  completion: boolean;
  values: T;
  acks?: ((v: void) => any)[];
  sent: boolean;
  merged: Frame<T> | undefined;
}

interface CombineLatestContext<T extends any[]> {
  closed: boolean;
  streams: { [idx in keyof T]: Observable<T[idx]> };
  subs: Subscription[];
  allOk: boolean;
  everyOk: boolean[];
  values: T;
  frame: Frame<T> | undefined;
  observer: Observer<T>;
}
