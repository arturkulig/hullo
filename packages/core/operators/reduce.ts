import {
  Subscription,
  Observable,
  Observer,
  ComplexProducer,
  Cancellation
} from "../Observable";

export function reduce<T, U>(
  accumulate: (accumulator: U, item: T) => U,
  start: U
) {
  return function reduceI(source: Observable<T>): Observable<U> {
    return new Observable<U>(
      new ReduceProducer<T, U>(source, accumulate, start)
    );
  };
}

class ReduceProducer<T, U> implements ComplexProducer<U> {
  constructor(
    private source: Observable<T>,
    private accumulate: (accumulator: U, item: T) => U,
    private start: U
  ) {}

  subscribe(observer: Observer<U>) {
    const sub = this.source.subscribe(
      new ReduceSourceObserver<T, U>(this.accumulate, this.start, observer)
    );
    return new ReduceCancel(sub);
  }
}

class ReduceSourceObserver<T, U> {
  get closed() {
    return this.observer.closed;
  }

  constructor(
    private accumulate: (accumulator: U, item: T) => U,
    private result: U,
    private observer: Observer<U>
  ) {}

  next(value: T) {
    const { accumulate } = this;
    this.result = accumulate(this.result, value);
  }

  async complete() {
    await this.observer.next(this.result);
    await this.observer.complete();
  }
}

class ReduceCancel implements Cancellation {
  constructor(private sub: Subscription) {}

  cancel() {
    if (!this.sub.closed) {
      this.sub.cancel();
    }
  }
}
