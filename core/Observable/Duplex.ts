import {
  observableSymbol,
  Observable,
  Subscription,
  PartialObserver,
  IObserver,
  IObservable
} from "./Observable";
import { Transducer } from "./Transducer";

const duplexSymbol = Symbol("is Duplex");

export class Duplex<IN, OUT, ObserverCtx>
  implements IObserver<IN, ObserverCtx>, IObservable<OUT> {
  [observableSymbol] = true;
  [duplexSymbol] = true;
  static symbol = duplexSymbol;
  static [Symbol.hasInstance](instance: unknown) {
    return (
      typeof instance === "object" &&
      instance !== null &&
      (instance as any)[duplexSymbol]
    );
  }

  constructor(
    observable: Observable<OUT>,
    observer: ObserverCtx extends IObserver<IN>
      ? IObserver<IN, IObserver<IN>>
      : never
  );
  constructor(
    observable: Observable<OUT>,
    observer: IObserver<IN, ObserverCtx>,
    observerContext: ObserverCtx
  );
  constructor(
    protected _observable: Observable<OUT>,
    protected _observer: IObserver<IN, ObserverCtx>,
    protected _observerContext: ObserverCtx = _observer as any
  ) {}

  next(value: IN) {
    return this._observer.next.call(this._observerContext, value);
  }

  complete() {
    return this._observer.complete.call(this._observerContext);
  }

  subscribe<ObserverCtx = any>(
    observer: PartialObserver<OUT, ObserverCtx>,
    observerContext?: ObserverCtx
  ): Subscription;
  subscribe<ObserverCtx = any>(
    observer: PartialObserver<OUT, ObserverCtx>,
    observerContext?: ObserverCtx
  ): Subscription;
  subscribe<ObserverCtx = any>(
    observer: PartialObserver<OUT, ObserverCtx>,
    observerContext?: ObserverCtx
  ): Subscription {
    return this._observable.subscribe(observer, observerContext);
  }

  pipe<U>(transducer: Transducer<OUT, U, any>): IObservable<U> {
    return this._observable.pipe(transducer);
  }
}
