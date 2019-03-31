import { Subscription, Observable, observable, Observer } from "../observable";

export function map<T, U>(xf: (v: T) => U) {
  return function mapI(source: Observable<T>): Observable<U> {
    return observable<U, MapContext<T, U>, MapArg<T, U>>(
      mapProducer,
      mapContext,
      { xf, source }
    );
  };
}

interface MapArg<T, U> {
  xf: (v: T) => U;
  source: Observable<T>;
}

interface MapContext<T, U> {
  xf: (v: T) => U;
  source: Observable<T>;
  sub: Subscription | undefined;
}

interface MapSubContext<T, U> {
  xf: (v: T) => U;
  observer: Observer<U>;
}

function mapContext<T, U>(arg: MapArg<T, U>): MapContext<T, U> {
  return {
    xf: arg.xf,
    source: arg.source,
    sub: undefined
  };
}

function mapProducer<T, U>(this: MapContext<T, U>, observer: Observer<U>) {
  this.sub = this.source.subscribe(
    {
      next: mapNext,
      complete: mapComplete
    },
    {
      xf: this.xf,
      observer
    }
  );

  return mapCancel;
}

function mapCancel<T, U>(this: MapContext<T, U>) {
  if (this.sub && !this.sub.closed) {
    this.sub.cancel();
  }
}

function mapNext<T, U>(this: MapSubContext<T, U>, value: T) {
  return this.observer.next(this.xf(value));
}

function mapComplete<T, U>(this: MapSubContext<T, U>) {
  return this.observer.complete();
}
