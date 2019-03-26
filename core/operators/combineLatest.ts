import {
  Observable,
  IObserver,
  Subscription,
  IObservable
} from "../Observable";
import { map } from "./map";
import { Consumer, Task } from "../Task";

function singleToArrayOfOne<T extends any[]>(v: T[keyof T]) {
  return [v] as T;
}

export function combineLatest<T extends [...any[]]>(
  streams: { [idx in keyof T]: IObservable<T[idx]> }
): IObservable<T> {
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
  acks: Consumer<void>[] | undefined;
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
  sending: boolean;
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
    sending: false,
    frame: undefined
  };
}

function combineLatestProducer<T extends any[]>(
  this: CombineLatestContext<T>,
  observer: IObserver<T>
) {
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
    if (this._context.closed) {
      return Task.resolved;
    }

    const values = this._context.values.slice(0) as T;
    values[this._position] = value;
    const frame: Frame<T> = {
      acks: undefined,
      completion: false,
      sent: false,
      values,
      merged: this._context.frame
    };
    this._context.frame = frame;
    this._context.values = values;

    if (!this._context.everyOk[this._position]) {
      this._context.everyOk[this._position] = true;

      if (!this._context.allOk) {
        this._context.allOk = true;
        for (let i = 0, l = this._context.everyOk.length; i < l; i++) {
          if (!this._context.everyOk[i]) {
            this._context.allOk = false;
            break;
          }
        }
      }
    }

    if (this._context.allOk && !this._context.sending) {
      Task.resolved.run<CombineLatestContext<T>>(send, this._context);
    }

    return new Task(frameDeliveryProducer, frameDeliveryContext, frame);
  }

  complete() {
    if (this._context.closed) {
      return Task.resolved;
    }
    const frame: Frame<T> = {
      acks: undefined,
      completion: true,
      sent: false,
      values: this._context.values,
      merged: this._context.frame
    };
    this._context.frame = frame;

    if (this._context.allOk && !this._context.sending) {
      Task.resolved.run<CombineLatestContext<T>>(send, this._context);
    }

    for (let i = 0, l = this._context.subs.length; i < l; i++) {
      if (i !== this._position && !this._context.subs[i].closed) {
        this._context.subs[i].cancel();
      }
    }

    return new Task(frameDeliveryProducer, frameDeliveryContext, frame);
  }
}

function send<T extends any[]>(this: CombineLatestContext<T>) {
  if (this.closed || this.sending || !this.frame || !this.observer) {
    return;
  }
  const frame = this.frame;
  this.frame = undefined;
  this.sending = true;
  (frame.completion
    ? this.observer.complete()
    : this.observer.next(frame.values)
  ).run<{
    frame: Frame<T>;
    context: CombineLatestContext<T>;
  }>(sent, { frame, context: this });
}

function sent<T extends any[]>(this: {
  frame: Frame<T>;
  context: CombineLatestContext<T>;
}) {
  const acks: Consumer<void>[] = [];
  let frame: Frame<T> | undefined = this.frame;
  let completion = false;
  while (frame) {
    frame.sent = true;
    if (frame.acks) {
      acks.push(...frame.acks);
    }

    completion = completion || frame.completion;

    frame = frame.merged;
  }

  if (completion) {
    this.context.closed = true;
  }

  for (let i = 0, l = acks.length; i < l; i++) {
    acks[i].resolve();
  }

  this.context.sending = false;

  if (!completion && this.frame) {
    Task.resolved.run<CombineLatestContext<T>>(send, this.context);
  }
}

function frameDeliveryContext<T extends any[]>(arg: Frame<T>): Frame<T> {
  return arg;
}

function frameDeliveryProducer<T extends any[]>(
  this: Frame<T>,
  consumer: Consumer<void>
) {
  if (this.sent) {
    consumer.resolve();
  } else {
    this.acks = this.acks || [];
    this.acks.push(consumer);
  }
}
