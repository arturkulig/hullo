import {
  Subscription,
  Observable,
  Observer,
  ComplexProducer,
  Cancellation
} from "../observable";

export function flatMap<T, U>(xf: XF<T, U>) {
  return function flatMapI(source: Observable<T>): Observable<U> {
    return new Observable<U>(new FlatMapProducer<T, U>(source, xf));
  };
}

class FlatMapProducer<T, U> implements ComplexProducer<U> {
  constructor(private source: Observable<T>, private xf: XF<T, U>) {}

  subscribe(observer: Observer<U>) {
    const sub = this.source.subscribe(
      new FlatMapSourceObserver<T, U>(observer, this.xf)
    );
    return new FlatMapCancel(sub);
  }
}

class FlatMapCancel implements Cancellation {
  constructor(private sub: Subscription) {}

  cancel() {
    if (!this.sub.closed) {
      this.sub.cancel();
    }
  }
}

class FlatMapSourceObserver<T, U> implements Observer<T> {
  get closed() {
    return this.outerObserver.closed;
  }

  constructor(private outerObserver: Observer<U>, private xf: XF<T, U>) {}

  next(value: T) {
    return new Promise<void>(resolve => {
      this.xf(value).subscribe(
        new FlatMapInnerSourceObserver<U>(this.outerObserver, resolve)
      );
    });
  }

  complete() {
    return this.outerObserver.complete();
  }
}

class FlatMapInnerSourceObserver<U> implements Observer<U> {
  get closed() {
    return this.outerObserver.closed;
  }

  constructor(private outerObserver: Observer<U>, private done: () => any) {}

  next(value: U) {
    return this.outerObserver.next(value);
  }

  complete() {
    const { done } = this;
    done();
    return Promise.resolve();
  }
}

interface XF<T, U> {
  (v: T): Observable<U>;
}
