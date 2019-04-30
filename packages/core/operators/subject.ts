import {
  Observer,
  Observable,
  Subscription,
  ComplexProducer,
  Cancellation
} from "../observable";

export function subject<T>(source: Observable<T>) {
  return new Observable<T>(
    new SubjectProducer<T>(source, {
      observers: [],
      sourceSub: undefined
    })
  );
}

class SubjectProducer<T> implements ComplexProducer<T> {
  constructor(
    private source: Observable<T>,
    private context: SubjectContext<T>
  ) {}

  subscribe(observer: Observer<T>) {
    this.context.observers.push(observer);

    if (!this.context.sourceSub) {
      this.context.sourceSub = this.source.subscribe(
        new SubjectSourceObserver<T>(this.context)
      );
    }

    return new SubjectCancel<T>(observer, this.context);
  }
}

class SubjectSourceObserver<T> implements Observer<T> {
  get closed() {
    return this.context.observers.length === 0;
  }

  constructor(private context: SubjectContext<T>) {}

  next(value: T) {
    const deliveries: Promise<void>[] = [];
    const { observers } = this.context;
    for (let i = 0, l = observers.length; i < l; i++) {
      const delivery = observers[i].next(value);
      deliveries.push(delivery);
    }
    return deliveries.length ? Promise.all(deliveries) : Promise.resolve();
  }

  complete() {
    const deliveries: Promise<void>[] = [];
    this.context.sourceSub = undefined;
    const observers = this.context.observers.splice(0);
    for (let i = 0, l = observers.length; i < l; i++) {
      const delivery = observers[i].complete();
      deliveries.push(delivery);
    }
    return deliveries.length ? Promise.all(deliveries) : Promise.resolve();
  }
}

class SubjectCancel<T> implements Cancellation {
  constructor(
    private observer: Observer<T>,
    private context: SubjectContext<T>
  ) {}

  cancel() {
    const pos = this.context.observers.indexOf(this.observer);
    if (pos >= 0) {
      this.context.observers.splice(pos, 1);

      if (this.context.observers.length === 0 && this.context.sourceSub) {
        const { sourceSub } = this.context;
        this.context.sourceSub = undefined;
        if (!sourceSub.closed) {
          sourceSub.cancel();
        }
      }
    }
  }
}

type SubjectContext<T> = {
  sourceSub: Subscription | undefined;
  observers: Observer<T>[];
};
