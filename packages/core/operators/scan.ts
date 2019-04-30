import {
  Observable,
  Observer,
  Subscription,
  ComplexProducer,
  Cancellation
} from "../observable";

export function scan<T, U>(
  accumulate: (accumulator: U, item: T) => U,
  start: U
) {
  return function scanI(source: Observable<T>): Observable<U> {
    return new Observable<U>(new ScanProducer<T, U>(source, accumulate, start));
  };
}

class ScanProducer<T, U> implements ComplexProducer<U> {
  constructor(
    private source: Observable<T>,
    private accumulate: (accumulator: U, item: T) => U,
    private start: U
  ) {}

  subscribe(observer: Observer<U>) {
    const sourceSub = this.source.subscribe(
      new ScanObserver(this.accumulate, this.start, observer)
    );

    return new ScanCancel(sourceSub);
  }
}

class ScanObserver<T, U> implements Observer<T> {
  get closed() {
    return this.outerObserver.closed;
  }

  constructor(
    private accumulate: (accumulator: U, item: T) => U,
    private last: U,
    private outerObserver: Observer<U>
  ) {}

  next(value: T) {
    if (this.outerObserver.closed) {
      return Promise.resolve();
    }
    this.last = this.accumulate(this.last, value);
    return this.outerObserver.next(this.last);
  }

  complete() {
    if (this.outerObserver.closed) {
      return Promise.resolve();
    }
    return this.outerObserver.complete();
  }
}

class ScanCancel implements Cancellation {
  constructor(private sourceSub: Subscription) {}

  cancel() {
    if (!this.sourceSub.closed) {
      this.sourceSub.cancel();
    }
  }
}
