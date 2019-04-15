import { Observer, Observable, Subscription, observable } from "../observable";

type SubjectWideContext<T> = {
  sourceSub: Subscription | undefined;
  source: Observable<T>;
  observers: Observer<T>[];
};

interface SubjectContext<T> {
  wide: SubjectWideContext<T>;
  observer: Observer<T> | undefined;
}

export function subject<T>(source: Observable<T>): Observable<T> {
  return observable<T, SubjectContext<T>, SubjectWideContext<T>>(
    subjectProduce,
    subjectContext,
    {
      source,
      sourceSub: undefined,
      observers: []
    }
  );
}

function subjectContext<T>(arg: SubjectWideContext<T>): SubjectContext<T> {
  return {
    wide: arg,
    observer: undefined
  };
}

function subjectProduce<T>(this: SubjectContext<T>, observer: Observer<T>) {
  this.observer = observer;
  this.wide.observers.push(observer);
  this.wide.sourceSub =
    this.wide.sourceSub ||
    this.wide.source.subscribe(new BroadcastObserver(this.wide));

  return subjectCancel;
}

function subjectCancel<T>(this: SubjectContext<T>) {
  if (!this.observer) {
    return;
  }
  const pos = this.wide.observers.indexOf(this.observer);
  if (pos >= 0) {
    this.wide.observers.splice(pos, 1);
    if (this.wide.observers.length === 0) {
      const { sourceSub } = this.wide;
      this.wide.sourceSub = undefined;
      if (sourceSub && !sourceSub.closed) {
        sourceSub.cancel();
      }
    }
  }
}

class BroadcastObserver<T> implements Observer<T, BroadcastObserver<T>> {
  get closed() {
    return this._wide.observers.length > 0;
  }

  constructor(private _wide: SubjectWideContext<T>) {}

  next(value: T) {
    const deliveries: Promise<void>[] = [];
    const { observers } = this._wide;
    for (let i = 0, l = observers.length; i < l; i++) {
      const delivery = observers[i].next(value);
      deliveries.push(delivery);
    }
    return deliveries.length ? Promise.all(deliveries) : Promise.resolve();
  }

  complete() {
    const deliveries: Promise<void>[] = [];
    this._wide.sourceSub = undefined;
    const observers = this._wide.observers.splice(0);
    for (let i = 0, l = observers.length; i < l; i++) {
      const delivery = observers[i].complete();
      deliveries.push(delivery);
    }
    return deliveries.length ? Promise.all(deliveries) : Promise.resolve();
  }
}
