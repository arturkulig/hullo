import { Transducer } from "../Observable";
import { IObserver, IObservable, Subscription } from "../Observable";
import { Task, Consumer } from "../Task";

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
  mainAlive: boolean;
  mainCompletionAcks: Consumer<void>[];
}

function start<T, U>(
  this: FlatMap<T, U>,
  successive: IObserver<U>
): FlatMapContext<T, U> {
  return {
    successive,
    xt: this.xt,
    subscriptions: [],
    mainAlive: true,
    mainCompletionAcks: []
  };
}

function next<T, U>(this: FlatMapContext<T, U>, value: T) {
  this.subscriptions.push(this.xt(value).subscribe(new FlatMapObserver(this)));
  return Task.resolved;
}

class FlatMapObserver<T> {
  constructor(private _context: FlatMapContext<any, T>) {}

  next(value: T) {
    return this._context.successive.next(value);
  }

  complete() {
    if (
      !areSubscriptionsAlive(this._context.subscriptions) &&
      !this._context.mainAlive
    ) {
      const acks = this._context.mainCompletionAcks;
      for (let i = 0, l = acks.length; i < l; i++) {
        acks[i].resolve();
      }
      this._context.successive.complete();
    }
  }
}

function complete<T, U>(this: FlatMapContext<T, U>) {
  this.mainAlive = false;
  return areSubscriptionsAlive(this.subscriptions)
    ? new Task(flatMapCompletionProducer, flatMapCompletionContext, this)
    : this.successive.complete();
}

function flatMapCompletionContext<T, U>(arg: FlatMapContext<T, U>) {
  return arg;
}

function flatMapCompletionProducer<T, U>(
  this: FlatMapContext<T, U>,
  consumer: Consumer<void>
) {
  if (areSubscriptionsAlive(this.subscriptions)) {
    this.mainCompletionAcks.push(consumer);
  } else {
    consumer.resolve();
  }
}

function areSubscriptionsAlive(this: unknown, subs: Subscription[]) {
  for (let i = 0, l = subs.length; i < l; i++) {
    if (!subs[i].closed) {
      return true;
    }
  }
  return false;
}

function cancel<T, U>(this: FlatMapContext<T, U>) {
  for (let i = 0, l = this.subscriptions.length; i < l; i++) {
    if (!this.subscriptions[i].closed) {
      this.subscriptions[i].cancel();
    }
  }
}
