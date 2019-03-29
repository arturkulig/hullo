import { Observable, IObserver, IObservable, Subscription } from "./Observable";

type SubjectWideContext<T> = {
  sourceSub: Subscription | undefined;
  source: IObservable<T>;
  observers: IObserver<T>[];
};

interface SubjectContext<T> {
  wide: SubjectWideContext<T>;
  observer: IObserver<T> | undefined;
}

export class Subject<T> extends Observable<
  T,
  SubjectContext<T>,
  SubjectWideContext<T>
> {
  constructor(_source: IObservable<T>) {
    super(subjectProduce, subjectContext, {
      source: _source,
      sourceSub: undefined,
      observers: []
    });
  }
}

function subjectContext<T>(arg: SubjectWideContext<T>): SubjectContext<T> {
  return {
    wide: arg,
    observer: undefined
  };
}

function subjectProduce<T>(this: SubjectContext<T>, observer: IObserver<T>) {
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

class BroadcastObserver<T> implements IObserver<T, BroadcastObserver<T>> {
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
    const { observers } = this._wide;
    for (let i = 0, l = observers.length; i < l; i++) {
      const delivery = observers[i].complete();
      deliveries.push(delivery);
    }
    return deliveries.length ? Promise.all(deliveries) : Promise.resolve();
  }
}
