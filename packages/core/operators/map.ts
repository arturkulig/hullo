import {
  Subscription,
  Observable,
  Observer,
  ComplexProducer,
  Cancellation
} from "../Observable";

export function map<T, U>(xf: XF<T, U>) {
  return function mapI(source: Observable<T>): Observable<U> {
    return new Observable<U>(new MapProducer<T, U>(source, xf));
  };
}

class MapProducer<T, U> implements ComplexProducer<U> {
  constructor(private source: Observable<T>, private xf: XF<T, U>) {}

  subscribe(observer: Observer<U>) {
    const sub = this.source.subscribe(
      new MapSourceObserver<T, U>(this.xf, observer)
    );
    return new MapCancel(sub);
  }
}

class MapSourceObserver<T, U> {
  get closed() {
    return this.observer.closed;
  }

  constructor(private xf: XF<T, U>, private observer: Observer<U>) {}

  next(value: T) {
    const { xf } = this;
    return this.observer.next(xf(value));
  }

  complete() {
    return this.observer.complete();
  }
}

class MapCancel implements Cancellation {
  constructor(private sub: Subscription) {}

  cancel() {
    if (!this.sub.closed) {
      this.sub.cancel();
    }
  }
}

interface XF<T, U> {
  (v: T): U;
}
