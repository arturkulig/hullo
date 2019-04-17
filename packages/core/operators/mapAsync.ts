import { Subscription, Observable, observable, Observer } from "../observable";

export function mapAsync<T, U>(xf: (v: T) => Promise<U>) {
  return function mapAsyncI(source: Observable<T>): Observable<U> {
    return observable<U, MapAsyncContext<T, U>, MapAsyncArg<T, U>>(
      mapAsyncProducer,
      mapAsyncContext,
      { xf, source }
    );
  };
}

interface MapAsyncArg<T, U> {
  xf: (v: T) => Promise<U>;
  source: Observable<T>;
}

interface MapAsyncContext<T, U> {
  xf: (v: T) => Promise<U>;
  source: Observable<T>;
  sub: Subscription | undefined;
}

interface MapAsyncSubContext<T, U> {
  xf: (v: T) => Promise<U>;
  observer: Observer<U>;
}

function mapAsyncContext<T, U>(arg: MapAsyncArg<T, U>): MapAsyncContext<T, U> {
  return {
    xf: arg.xf,
    source: arg.source,
    sub: undefined
  };
}

function mapAsyncProducer<T, U>(
  this: MapAsyncContext<T, U>,
  observer: Observer<U>
) {
  this.sub = this.source.subscribe(
    {
      next: mapAsyncNext,
      complete: mapAsyncComplete
    },
    {
      xf: this.xf,
      observer
    }
  );

  return mapAsyncCancel;
}

function mapAsyncCancel<T, U>(this: MapAsyncContext<T, U>) {
  if (this.sub && !this.sub.closed) {
    this.sub.cancel();
  }
}

function mapAsyncNext<T, U>(this: MapAsyncSubContext<T, U>, t: T) {
  return this.xf(t).then(u => this.observer.next(u));
}

function mapAsyncComplete<T, U>(this: MapAsyncSubContext<T, U>) {
  return this.observer.complete();
}
