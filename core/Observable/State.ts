import { Observable, IObserver, IObservable, Subscription } from "./Observable";
import { Task, Execution } from "../Task";

type StateWideContext<T> = {
  initial: T;
  last?: T;
  sourceSub: Subscription | undefined;
  source: IObservable<T>;
  successive: IObserver<T>[];
  initialSending: Execution[];
};

interface StateContext<T> {
  wide: StateWideContext<T>;
  observer: IObserver<T> | undefined;
}

export class State<T> extends Observable<
  T,
  StateContext<T>,
  StateWideContext<T>
> {
  constructor(source: IObservable<T>, initial: T) {
    super(subjectProduce, subjectContext, {
      initial,
      source,
      sourceSub: undefined,
      successive: [],
      initialSending: []
    });
  }

  valueOf(): T {
    if (!this._arg) {
      throw new Error();
    }
    return "last" in this._arg ? this._arg!.last! : this._arg.initial;
  }
}

function subjectContext<T>(arg: StateWideContext<T>): StateContext<T> {
  return {
    wide: arg,
    observer: undefined
  };
}

function subjectProduce<T>(this: StateContext<T>, observer: IObserver<T>) {
  this.observer = observer;
  this.wide.successive.push(observer);
  this.wide.initialSending.push(
    Task.resolved.run<typeof this>(sendInitial, this)
  );
  this.wide.sourceSub =
    this.wide.sourceSub ||
    this.wide.source.subscribe(new BroadcastObserver(this.wide));
  return subjectCancel;
}

function sendInitial<T>(this: StateContext<T>) {
  if (this.observer) {
    this.observer.next(
      "last" in this.wide ? this.wide.last! : this.wide.initial
    );
  }
}

function subjectCancel<T>(this: StateContext<T>) {
  if (!this.observer) {
    return;
  }
  const pos = this.wide.successive.indexOf(this.observer);
  if (pos >= 0) {
    this.wide.successive.splice(pos, 1);
    if (this.wide.successive.length === 0) {
      const { sourceSub } = this.wide;
      this.wide.sourceSub = undefined;
      if (sourceSub && !sourceSub.closed) {
        sourceSub.cancel();
      }
    }
  }
}

class BroadcastObserver<T> implements IObserver<T, BroadcastObserver<T>> {
  constructor(private _wide: StateWideContext<T>) {}

  next(value: T) {
    this._wide.last = value;
    const initialSending = this._wide.initialSending.splice(0);
    for (let i = 0, l = initialSending.length; i < l; i++) {
      if (!initialSending[i].closed) {
        initialSending[i].cancel();
      }
    }
    const deliveries: Task<void>[] = [];
    const { successive: observers } = this._wide;
    for (let i = 0, l = observers.length; i < l; i++) {
      const delivery = observers[i].next(value);
      if (delivery !== Task.resolved) {
        deliveries.push(delivery);
      }
    }
    return deliveries.length ? Task.all(deliveries) : Task.resolved;
  }

  complete() {
    const deliveries: Task<void>[] = [];
    const { successive: observers } = this._wide;
    for (let i = 0, l = observers.length; i < l; i++) {
      const delivery = observers[i].complete();
      if (delivery !== Task.resolved) {
        deliveries.push(delivery);
      }
    }
    return deliveries.length ? Task.all(deliveries) : Task.resolved;
  }
}
