import {
  Observable,
  IObserver,
  Subscription,
  IObservable
} from "../Observable";
import { map } from "./map";
import { Consumer, Task } from "../Task";
import { schedule } from "../Task/schedule";

function singleToArrayOfOne<T extends any[]>(v: T[keyof T]) {
  return [v] as T;
}

export function combineLatest<T extends [...any[]]>(
  streams: { [idx in keyof T]: IObservable<T[idx]> }
): IObservable<T> {
  // console.log("combine many", streams.length);
  if (streams.length === 0) {
    return Observable.of([([] as unknown) as T]);
  }
  if (streams.length === 1) {
    return streams[0].pipe(map<T[keyof T], T>(singleToArrayOfOne));
  }
  return new Observable(combineLatestProducer, combineLatestContext, streams);
}

type CombineLatestArgument<T extends any[]> = {
  [idx in keyof T]: Observable<T[idx]>
};

interface Frame<T extends any[]> {
  completion: boolean;
  values: T;
  acks?: Consumer<void>[];
  sent: boolean;
  merged: Frame<T> | undefined;
}

interface CombineLatestContext<T extends any[]> {
  closed: boolean;
  sources: { [idx in keyof T]: Observable<T[idx]> };
  subs: Subscription[];
  allOk: boolean;
  everyOk: boolean[];
  values: T;
  // sending: boolean;
  frame: Frame<T> | undefined;
  observer?: IObserver<T>;
}

function combineLatestContext<T extends any[]>(
  arg: CombineLatestArgument<T>
): CombineLatestContext<T> {
  const everyOk: boolean[] = arg.map(() => false);
  const allOk: boolean = everyOk.reduce((r, i) => r && i, true);
  return {
    closed: false,
    sources: arg,
    subs: [],
    everyOk,
    allOk,
    values: ([] as unknown) as T,
    // sending: false,
    frame: undefined
  };
}

function combineLatestProducer<T extends any[]>(
  this: CombineLatestContext<T>,
  observer: IObserver<T>
) {
  // console.log("combined start");
  this.observer = observer;
  for (let i = 0, l = this.sources.length; i < l; i++) {
    this.subs[i] = this.sources[i].subscribe(
      new CombineLatestEntryObserver<T>(this, i)
    );
  }

  return combineLatestCancel;
}

function combineLatestCancel<T extends any[]>(this: CombineLatestContext<T>) {
  this.closed = true;
  for (let i = 0, l = this.subs.length; i < l; i++) {
    if (!this.subs[i].closed) {
      this.subs[i].cancel();
    }
  }
}

class CombineLatestEntryObserver<T extends any[]>
  implements IObserver<T[keyof T], CombineLatestEntryObserver<T>> {
  constructor(
    private _context: CombineLatestContext<T>,
    private _position: number
  ) {}

  next(value: T[keyof T]) {
    // console.log("combined next");
    if (this._context.closed) {
      // console.log("combined next - closed");
      return Task.resolved;
    }

    if (this._context.frame && this._context.frame.completion) {
      // console.log("combined next - completion pushed, same frame confirmation");
      return new Task(frameDeliveryProducer, this._context.frame);
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

    if (
      this._context.allOk
      //  && !this._context.sending
    ) {
      // console.log("combined next - all OK, schedule sending");
      schedule<void, CombineLatestContext<T>>(send, this._context);
    }

    return new Task(frameDeliveryProducer, frame);
  }

  complete() {
    // console.log("combined complete");
    if (this._context.closed) {
      // console.log("combined complete - closed");
      return Task.resolved;
    }

    if (this._context.frame && this._context.frame.completion) {
      // console.log("combined next - completion pushed, same frame confirmation");
      return new Task(frameDeliveryProducer, this._context.frame);
    }

    const frame: Frame<T> = {
      sent: false,
      completion: true,
      values: this._context.values,
      merged: this._context.frame
    };
    this._context.frame = frame;

    // console.log("combined complete - all OK, schedule sending");
    schedule<void, CombineLatestContext<T>>(send, this._context);

    for (let i = 0, l = this._context.subs.length; i < l; i++) {
      if (i !== this._position && !this._context.subs[i].closed) {
        this._context.subs[i].cancel();
      }
    }

    return new Task(frameDeliveryProducer, frame);
  }
}

function send<T extends any[]>(this: CombineLatestContext<T>) {
  if (this.closed || !this.frame || !this.observer) {
    return;
  }
  const frame = this.frame;
  this.frame = undefined;

  if (frame.completion) {
    this.closed = true;
  }

  (frame.completion
    ? this.observer.complete()
    : this.observer.next(frame.values)
  ).run<typeof frame>(frameDeliveryConfirmations, frame);
}

function frameDeliveryProducer<T extends any[]>(
  this: Frame<T>,
  consumer: Consumer<void>
) {
  if (this.sent) {
    consumer.resolve();
  } else {
    if (this.acks) {
      this.acks.push(consumer);
    } else {
      this.acks = [consumer];
    }
  }
}

function frameDeliveryConfirmations<T extends any[]>(this: Frame<T>) {
  let innerFrame: Frame<T> | undefined = this;
  while (innerFrame) {
    innerFrame.sent = true;
    for (
      let i = 0, l = innerFrame.acks ? innerFrame.acks.length : 0;
      i < l;
      i += 1
    ) {
      innerFrame.acks![i].resolve();
    }
    innerFrame = innerFrame.merged;
  }
}
