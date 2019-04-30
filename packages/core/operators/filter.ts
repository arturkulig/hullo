import {
  Subscription,
  Observable,
  Observer,
  ComplexProducer,
  Cancellation
} from "../observable";

export function filter<T>(predicate: Predicate<T>) {
  return function filterI(source: Observable<T>): Observable<T> {
    return new Observable<T>(new FilterProducer<T>(source, predicate));
  };
}

class FilterProducer<T> implements ComplexProducer<T> {
  constructor(private source: Observable<T>, private xf: Predicate<T>) {}

  subscribe(observer: Observer<T>) {
    const sub = this.source.subscribe(
      new FilterSourceObserver<T>(this.xf, observer)
    );
    return new FilterCancel(sub);
  }
}

class FilterSourceObserver<T> {
  get closed() {
    return this.observer.closed;
  }

  constructor(private predicate: Predicate<T>, private observer: Observer<T>) {}

  next(value: T) {
    const { predicate } = this;
    return predicate(value) ? this.observer.next(value) : Promise.resolve();
  }

  complete() {
    return this.observer.complete();
  }
}

class FilterCancel implements Cancellation {
  constructor(private sub: Subscription) {}

  cancel() {
    if (!this.sub.closed) {
      this.sub.cancel();
    }
  }
}

interface Predicate<T> {
  (v: T): boolean;
}
