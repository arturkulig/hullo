import {
  observableSymbol,
  Subscription,
  Subscriber,
  Observer,
  Observable
} from "./observable";

const duplexSymbol = Symbol("is Duplex");

export function duplex<IN, INCTX, OUT>(
  observable: Observable<OUT>,
  observer: Observer<IN, INCTX>,
  observerContext?: INCTX
): Duplex<IN, OUT>;
export function duplex<IN, OUT>(
  observable: Observable<OUT>,
  observer: Observer<IN>
): Duplex<IN, OUT>;
export function duplex<IN, OUT>(
  observable: Observable<OUT>,
  observer: Observer<IN>,
  observerContext?: any
): Duplex<IN, OUT> {
  const d: PrivateDuplex<IN, OUT> = {
    [observableSymbol]: true as true,
    [duplexSymbol]: true as true,

    get closed() {
      return observer.closed;
    },

    observer,
    observable,
    observerContext,

    next,
    complete,

    subscribe,
    pipe
  };
  return d;
}

interface PrivateDuplex<IN, OUT> extends Duplex<IN, OUT> {
  observable: Observable<OUT>;
  observer: Observer<IN, any>;
  observerContext: any;
}

export interface Duplex<IN, OUT> extends Observable<OUT>, Observer<IN> {
  [duplexSymbol]: true;
}

function next<IN, OUT>(this: PrivateDuplex<IN, OUT>, value: IN) {
  return this.observer.next.call(this.observerContext, value);
}

function complete<IN, OUT>(this: PrivateDuplex<IN, OUT>) {
  return this.observer.complete.call(this.observerContext);
}

function subscribe<IN, OUT, ObserverCtx = any>(
  this: PrivateDuplex<IN, OUT>,
  observer: Subscriber<OUT, ObserverCtx>,
  observerContext?: ObserverCtx
): Subscription;
function subscribe<IN, OUT, ObserverCtx = any>(
  this: PrivateDuplex<IN, OUT>,
  observer: Subscriber<OUT, ObserverCtx>,
  observerContext?: ObserverCtx
): Subscription;
function subscribe<IN, OUT, ObserverCtx = any>(
  this: PrivateDuplex<IN, OUT>,
  observer: Subscriber<OUT, ObserverCtx>,
  observerContext?: ObserverCtx
): Subscription {
  return this.observable.subscribe(observer, observerContext);
}

function pipe<IN, OUT, U>(
  this: PrivateDuplex<IN, OUT>,
  transducer: (v: Observable<OUT>) => U
): U {
  return this.observable.pipe(transducer);
}
