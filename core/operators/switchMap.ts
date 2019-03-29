import {
  Observable,
  IObservable,
  IObserver,
  Subscription
} from "../Observable";

export function switchMap<T, U>(xf: (v: T) => IObservable<U>) {
  return function switchMapI(source: IObservable<T>) {
    return new Observable<U>(switchMapProducer, switchMapContext, {
      xf,
      source
    });
  };
}

interface SwitchMapArg<T, U> {
  xf: (v: T) => IObservable<U>;
  source: IObservable<T>;
}

interface SwitchMapContext<T, U> {
  xf: (v: T) => IObservable<U>;
  source: IObservable<T>;
  sub: Subscription | undefined;
  innerSub: Subscription | undefined;
}

interface SwitchMapSubContext<T, U> {
  context: SwitchMapContext<T, U>;
  observer: IObserver<U>;
}

function switchMapContext<T, U>(
  arg: SwitchMapArg<T, U>
): SwitchMapContext<T, U> {
  return {
    xf: arg.xf,
    source: arg.source,
    sub: undefined,
    innerSub: undefined
  };
}

function switchMapProducer<T, U>(
  this: SwitchMapContext<T, U>,
  observer: IObserver<U>
) {
  const subCtx: SwitchMapSubContext<T, U> = { observer, context: this };
  this.sub = this.source.subscribe(
    {
      next: switchMapNext,
      complete: switchMapComplete
    },
    subCtx
  );

  return switchMapCancel;
}

function switchMapCancel<T, U>(this: SwitchMapContext<T, U>) {
  if (this.sub && !this.sub.closed) {
    this.sub.cancel();
  }
}

function switchMapNext<T, U>(this: SwitchMapSubContext<T, U>, value: T) {
  if (this.context.innerSub && !this.context.innerSub.closed) {
    this.context.innerSub.cancel();
  }

  this.context.innerSub = this.context.xf(value).subscribe(
    {
      next: switchMapInnerNext,
      complete: switchMapInnerComplete
    },
    this
  );
}

function switchMapInnerNext<T, U>(this: SwitchMapSubContext<T, U>, value: U) {
  return this.observer.next(value);
}

function switchMapInnerComplete<T, U>(this: SwitchMapSubContext<T, U>) {
  if (this.context.sub == null || this.context.sub.closed) {
    return this.observer.complete();
  }
}

function switchMapComplete<T, U>(this: SwitchMapSubContext<T, U>) {
  if (this.context.innerSub == null || this.context.innerSub.closed) {
    return this.observer.complete();
  }
}