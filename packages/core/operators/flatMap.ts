import { Subscription, observable, Observable, Observer } from "../observable";

export function flatMap<T, U>(xf: (v: T) => Observable<U>) {
  return function flatMapI(source: Observable<T>): Observable<U> {
    return observable<U, FlatMapContext<T, U>, FlatMapArg<T, U>>(
      flatMapProducer,
      flatMapContext,
      { xf, source }
    );
  };
}

interface FlatMapArg<T, U> {
  xf: (v: T) => Observable<U>;
  source: Observable<T>;
}

interface FlatMapContext<T, U> {
  xf: (v: T) => Observable<U>;
  source: Observable<T>;
  sub: Subscription | undefined;
  innerSub: Subscription | undefined;
}

interface FlatMapSubContext<T, U> {
  context: FlatMapContext<T, U>;
  observer: Observer<U>;
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
  observer: Observer<U>
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
