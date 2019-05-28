import {
  Subscription,
  Observable,
  Observer,
  ComplexProducer,
  Cancellation
} from "../Observable";

export function mapAsync<T, U>(xf: XF<T, U>) {
  return function mapAsyncI(source: Observable<T>): Observable<U> {
    return new Observable<U>(new MapAsyncProducer<T, U>(source, xf));
  };
}

class MapAsyncProducer<T, U> implements ComplexProducer<U> {
  constructor(private source: Observable<T>, private xf: XF<T, U>) {}

  subscribe(observer: Observer<U>) {
    const sub = this.source.subscribe(
      new MapAsyncSourceObserver<T, U>(this.xf, observer)
    );
    return new MapAsyncCancel(sub);
  }
}

class MapAsyncSourceObserver<T, U> {
  get closed() {
    return this.observer.closed;
  }

  constructor(private xf: XF<T, U>, private observer: Observer<U>) {}

  next(valueT: T) {
    const { xf } = this;
    return xf(valueT).then(valueU => this.observer.next(valueU));
  }

  complete() {
    return this.observer.complete();
  }
}

class MapAsyncCancel implements Cancellation {
  constructor(private sub: Subscription) {}

  cancel() {
    if (!this.sub.closed) {
      this.sub.cancel();
    }
  }
}

interface XF<T, U> {
  (v: T): Promise<U>;
}
