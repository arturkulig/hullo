import { Transducer } from "../Observable";
import { IObserver, IObservable, Subscription } from "../Observable";

export function flatMap<T, U>(xt: Transform<T, U>): FlatMap<T, U> {
  return {
    xt,
    start,
    next,
    complete,
    cancel
  };
}

interface Transform<T, U> {
  (value: T): IObservable<U>;
}

interface FlatMap<T, U> extends Transducer<T, U, FlatMapContext<T, U>> {
  xt: Transform<T, U>;
}

interface FlatMapContext<T, U> {
  xt: Transform<T, U>;
  successive: IObserver<U>;
  subscriptions: Subscription[];
}

function start<T, U>(
  this: FlatMap<T, U>,
  successive: IObserver<U>
): FlatMapContext<T, U> {
  return {
    successive,
    xt: this.xt,
    subscriptions: []
  };
}

function next<T, U>(this: FlatMapContext<T, U>, outerValue: T) {
  return new Promise<void>(r => {
    this.subscriptions.push(
      this.xt(outerValue).subscribe(new FlatMapObserver(this, r))
    );
  });
}

class FlatMapObserver<T> {
  constructor(
    private _context: FlatMapContext<any, T>,
    private _ack: (v: void) => any
  ) {}

  next(value: T) {
    return this._context.successive.next(value);
  }

  complete() {
    this._ack();
  }
}

function complete<T, U>(this: FlatMapContext<T, U>) {
  return this.successive.complete();
}

function cancel<T, U>(this: FlatMapContext<T, U>) {
  for (let i = 0, l = this.subscriptions.length; i < l; i++) {
    if (!this.subscriptions[i].closed) {
      this.subscriptions[i].cancel();
    }
  }
}
