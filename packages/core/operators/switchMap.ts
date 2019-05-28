import {
  Observable,
  Observer,
  Subscription,
  ComplexProducer,
  Cancellation
} from "../Observable";

export function switchMap<T, U>(xf: (v: T) => Observable<U>) {
  return function switchMapI(source: Observable<T>) {
    return new Observable<U>(new SwitchMapProducer<T, U>(xf, source));
  };
}

class SwitchMapProducer<T, U> implements ComplexProducer<U> {
  constructor(
    private xf: (v: T) => Observable<U>,
    private source: Observable<T>
  ) {}

  subscribe(observer: Observer<U>) {
    const context: SwitchMapContext<T, U> = {
      mainCompleted: false,
      innerSub: undefined,
      xf: this.xf,
      outerObserver: observer
    };

    const sub = this.source.subscribe(new SwitchMapObserver<T, U>(context));

    return new SwitchMapCancel(sub, context);
  }
}

class SwitchMapCancel<T, U> implements Cancellation {
  constructor(
    private sub: Subscription,
    private context: SwitchMapContext<T, U>
  ) {}

  cancel() {
    if (this.sub && !this.sub.closed) {
      this.sub.cancel();
    }
    if (this.context.innerSub && !this.context.innerSub.closed) {
      this.context.innerSub.cancel();
    }
  }
}

class SwitchMapObserver<T, U> implements Observer<T> {
  get closed() {
    return this.context.outerObserver.closed;
  }

  constructor(private context: SwitchMapContext<T, U>) {}

  next(value: T) {
    if (this.context.innerSub && !this.context.innerSub.closed) {
      this.context.innerSub.cancel();
    }

    const {
      context: { xf }
    } = this;
    this.context.innerSub = xf(value).subscribe(
      new InnerSwitchMapObserver<T, U>(this.context)
    );

    return Promise.resolve();
  }

  complete() {
    this.context.mainCompleted = true;
    if (this.context.innerSub == null) {
      return this.context.outerObserver.complete();
    }
    return Promise.resolve();
  }
}

class InnerSwitchMapObserver<T, U> implements Observer<U> {
  get closed() {
    return this.context.outerObserver.closed;
  }

  constructor(private context: SwitchMapContext<T, U>) {}

  next(value: U) {
    if (this.context.outerObserver.closed) {
      return Promise.resolve();
    }
    return this.context.outerObserver.next(value);
  }

  complete() {
    if (this.context.outerObserver.closed) {
      return Promise.resolve();
    }
    this.context.innerSub = undefined;
    if (this.context.mainCompleted) {
      return this.context.outerObserver.complete();
    }
    return Promise.resolve();
  }
}

interface SwitchMapContext<T, U> {
  xf: (v: T) => Observable<U>;
  outerObserver: Observer<U>;
  mainCompleted: boolean;
  innerSub: Subscription | undefined;
}
