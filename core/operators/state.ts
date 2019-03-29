import {
  Observable,
  IObserver,
  IObservable,
  Subscription
} from "../Observable";

type StateWideContext<T> = {
  initial: T;
  last?: T;
  sourceSub: Subscription | undefined;
  source: IObservable<T>;
  clients: StateContext<T>[] | undefined;
};

interface StateContext<T> {
  wide: StateWideContext<T>;
  observer: IObserver<T> | undefined;
  initialValueScheduled: boolean;
}

export function state<T>(initial: T) {
  return function stateI(
    source: IObservable<T>
  ): IObservable<T> & { valueOf(): T } {
    const wideContext: StateWideContext<T> = {
      initial,
      source,
      sourceSub: undefined,
      clients: undefined
    };
    return Object.assign(
      new Observable(subjectProduce, subjectContext, wideContext),
      {
        valueOf(): T {
          return "last" in wideContext
            ? wideContext!.last!
            : wideContext.initial;
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

function subjectProduce<T>(this: StateContext<T>, observer: IObserver<T>) {
  this.observer = observer;
  if (this.wide.clients == undefined) {
    this.wide.clients = [];
  }
  this.wide.clients.push(this);
  Promise.resolve(this).then(sendInitial);

  this.wide.sourceSub =
    this.wide.sourceSub ||
    this.wide.source.subscribe(new BroadcastObserver(this.wide));
  return subjectCancel;
}

function sendInitial<T>(context: StateContext<T>) {
  if (context.initialValueScheduled) {
    context.initialValueScheduled = false;
    context.observer!.next(
      "last" in context.wide ? context.wide.last! : context.wide.initial
    );
  }
}

function subjectCancel<T>(this: StateContext<T>) {
  if (!this.observer) {
    return;
  }
  if (this.wide.clients != undefined) {
    const pos = this.wide.clients.indexOf(this);
    if (pos >= 0) {
      this.wide.clients.splice(pos, 1);
      if (this.wide.clients.length === 0) {
        const { sourceSub } = this.wide;
        this.wide.sourceSub = undefined;
        if (sourceSub && !sourceSub.closed) {
          sourceSub.cancel();
        }
      }
    }
  }
}

class BroadcastObserver<T> implements IObserver<T, BroadcastObserver<T>> {
  constructor(private _wideContext: StateWideContext<T>) {}

  next(value: T) {
    this._wideContext.last = value;
    const deliveries: Promise<void>[] = [];
    const { clients } = this._wideContext;
    if (clients != undefined) {
      for (let i = 0, l = clients.length; i < l; i++) {
        clients[i].initialValueScheduled = false;
      }
      for (let i = 0, l = clients.length; i < l; i++) {
        const delivery = clients[i].observer!.next(value);
        deliveries.push(delivery);
      }
    }
    return deliveries.length ? Promise.all(deliveries) : Promise.resolve();
  }

  complete() {
    const deliveries: Promise<void>[] = [];
    const { clients } = this._wideContext;
    this._wideContext.clients = undefined;
    if (clients != undefined) {
      for (let i = 0, l = clients.length; i < l; i++) {
        const delivery = clients[i].observer!.complete();
        deliveries.push(delivery);
      }
    }
    return deliveries.length ? Promise.all(deliveries) : Promise.resolve();
  }
}
