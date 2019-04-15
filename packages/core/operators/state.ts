import { observable, Observer, Observable, Subscription } from "../observable";

type StateWideContext<T> = {
  last: T;
  sourceSub: Subscription | undefined;
  source: Observable<T>;
  observers: StateContext<T>[];
};

interface StateContext<T> {
  wide: StateWideContext<T>;
  observer: Observer<T> | undefined;
  initialValueScheduled: boolean;
}

export interface State<T> extends Observable<T> {
  valueOf(): T;
  unwrap(): T;
}

export function state<T>(initial: T) {
  return function stateI(source: Observable<T>): State<T> {
    const wideContext: StateWideContext<T> = {
      last: initial,
      source,
      sourceSub: undefined,
      observers: []
    };
    return Object.assign(
      observable<T, StateContext<T>, StateWideContext<T>>(
        subjectProduce,
        subjectContext,
        wideContext
      ),
      {
        valueOf(): T {
          return wideContext.last;
        },
        unwrap(): T {
          return wideContext.last;
        }
      }
    );
  };
}

function subjectContext<T>(arg: StateWideContext<T>): StateContext<T> {
  return {
    wide: arg,
    observer: undefined,
    initialValueScheduled: true
  };
}

function subjectProduce<T>(this: StateContext<T>, observer: Observer<T>) {
  this.observer = observer;
  if (this.wide.observers == undefined) {
    this.wide.observers = [];
  }
  this.wide.observers.push(this);

  Promise.resolve(this).then(sendInitial);

  this.wide.sourceSub =
    this.wide.sourceSub ||
    this.wide.source.subscribe(new BroadcastObserver(this.wide));
  return subjectCancel;
}

function sendInitial<T>(context: StateContext<T>) {
  if (context.initialValueScheduled) {
    context.initialValueScheduled = false;
    context.observer!.next(context.wide.last);
  }
}

function subjectCancel<T>(this: StateContext<T>) {
  if (!this.observer) {
    return;
  }
  if (this.wide.observers != undefined) {
    const pos = this.wide.observers.indexOf(this);
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
}

class BroadcastObserver<T> implements Observer<T, BroadcastObserver<T>> {
  get closed() {
    return this._wide.observers.length > 0;
  }

  constructor(private _wide: StateWideContext<T>) {}

  next(value: T) {
    this._wide.last = value;
    const deliveries: Promise<void>[] = [];
    const { observers } = this._wide;
    if (observers != undefined) {
      for (let i = 0, l = observers.length; i < l; i++) {
        observers[i].initialValueScheduled = false;
      }
      for (let i = 0, l = observers.length; i < l; i++) {
        const delivery = observers[i].observer!.next(value);
        deliveries.push(delivery);
      }
    }
    return deliveries.length ? Promise.all(deliveries) : Promise.resolve();
  }

  complete() {
    const deliveries: Promise<void>[] = [];
    const { observers } = this._wide;
    this._wide.observers = [];
    if (observers != undefined) {
      for (let i = 0, l = observers.length; i < l; i++) {
        const delivery = observers[i].observer!.complete();
        deliveries.push(delivery);
      }
    }
    return deliveries.length ? Promise.all(deliveries) : Promise.resolve();
  }
}
