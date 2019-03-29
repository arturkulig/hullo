import {
  Observable,
  IObservable,
  IObserver,
  Subscription
} from "../Observable";

export function flatMap<T, U>(xf: (v: T) => IObservable<U>) {
  return function flatMapI(source: IObservable<T>) {
    return new Observable<U>(flatMapProducer, flatMapContext, { xf, source });
  };
}

interface FlatMapArg<T, U> {
  xf: (v: T) => IObservable<U>;
  source: IObservable<T>;
}

interface FlatMapContext<T, U> {
  xf: (v: T) => IObservable<U>;
  source: IObservable<T>;
  sub: Subscription | undefined;
  innerSub: Subscription | undefined;
}

interface FlatMapSubContext<T, U> {
  context: FlatMapContext<T, U>;
  observer: IObserver<U>;
}

function flatMapContext<T, U>(arg: FlatMapArg<T, U>): FlatMapContext<T, U> {
  return {
    xf: arg.xf,
    source: arg.source,
    sub: undefined,
    innerSub: undefined
  };
}

function flatMapProducer<T, U>(
  this: FlatMapContext<T, U>,
  observer: IObserver<U>
) {
  const subCtx: FlatMapSubContext<T, U> = { observer, context: this };
  this.sub = this.source.subscribe(
    {
      next: flatMapNext,
      complete: flatMapComplete
    },
    subCtx
  );

  return flatMapCancel;
}

function flatMapCancel<T, U>(this: FlatMapContext<T, U>) {
  if (this.sub && !this.sub.closed) {
    this.sub.cancel();
  }
}

function flatMapNext<T, U>(this: FlatMapSubContext<T, U>, value: T) {
  return new Promise(r => {
    this.context.innerSub = this.context.xf(value).subscribe(
      {
        next: flatMapInnerNext,
        complete: r
      },
      this
    );
  });
}

function flatMapInnerNext<T, U>(this: FlatMapSubContext<T, U>, value: U) {
  return this.observer.next(value);
}

function flatMapComplete<T, U>(this: FlatMapSubContext<T, U>) {
  return this.observer.complete();
}
