import {
  Observable,
  IObservable,
  IObserver,
  Subscription
} from "../Observable";

export function distinctEqual<T>(source: IObservable<T>) {
  return new Observable<T>(distinctProducer, distinctContext, {
    compare: equal,
    source
  });
}

function equal<T>(p: T, n: T) {
  return p != n;
}

export function distinctStrictEqual<T>(source: IObservable<T>) {
  return new Observable<T>(distinctProducer, distinctContext, {
    compare: strictEqual,
    source
  });
}

function strictEqual<T>(p: T, n: T) {
  return p !== n;
}

export function distinct<T>(compare: (prev: T, next: T) => boolean) {
  return function distinctI(source: IObservable<T>) {
    return new Observable<T>(distinctProducer, distinctContext, {
      compare,
      source
    });
  };
}

interface DistinctArg<T> {
  compare: (prev: T, next: T) => boolean;
  source: IObservable<T>;
}

interface DistinctContext<T> {
  compare: (prev: T, next: T) => boolean;
  source: IObservable<T>;
  sub: Subscription | undefined;
}

interface DistinctSubContext<T> {
  hasLast: boolean;
  last?: T;
  compare: (prev: T, next: T) => boolean;
  observer: IObserver<T>;
}

function distinctContext<T>(arg: DistinctArg<T>): DistinctContext<T> {
  return {
    compare: arg.compare,
    source: arg.source,
    sub: undefined
  };
}

function distinctProducer<T>(this: DistinctContext<T>, observer: IObserver<T>) {
  this.sub = this.source.subscribe(
    {
      next: distinctNext,
      complete: distinctComplete
    },
    {
      compare: this.compare,
      observer
    }
  );

  return distinctCancel;
}

function distinctCancel<T>(this: DistinctContext<T>) {
  if (this.sub && !this.sub.closed) {
    this.sub.cancel();
  }
}

function distinctNext<T>(this: DistinctSubContext<T>, value: T) {
  if (!this.hasLast || this.compare(this.last!, value)) {
    this.hasLast = true;
    this.last = value;
    return this.observer.next(value);
  }
}

function distinctComplete<T>(this: DistinctSubContext<T>) {
  return this.observer.complete();
}
