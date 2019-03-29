import { Observable, IObserver, IObservable } from "./Observable";
import { Subject } from "./Subject";

type HotWideContext<T> = {
  observer: IObserver<T> | undefined;
};

interface HotContext<T> {
  wide: HotWideContext<T>;
}

export class Hot<T> extends Observable<T, HotContext<T>, HotWideContext<T>> {
  constructor(_source: IObservable<T>) {
    const wide = {
      observer: undefined
    };
    new Subject(_source).subscribe(new MaybeObserver(wide)),
      super(hotProduce, hotContext, wide);
  }
}

function hotContext<T>(arg: HotWideContext<T>): HotContext<T> {
  return {
    wide: arg
  };
}

function hotProduce<T>(this: HotContext<T>, observer: IObserver<T>) {
  this.wide.observer = observer;

  return hotCancel;
}

function hotCancel<T>(this: HotContext<T>) {
  this.wide.observer = undefined;
}

class MaybeObserver<T> implements IObserver<T, MaybeObserver<T>> {
  constructor(private _wide: HotWideContext<T>) {}

  next(value: T) {
    return this._wide.observer
      ? this._wide.observer.next(value)
      : Promise.resolve();
  }

  complete() {
    return this._wide.observer
      ? this._wide.observer.complete()
      : Promise.resolve();
  }
}
