import { Subscription, Observable, observable, Observer } from "../observable";

export function filter<T>(predicate: (v: T) => boolean) {
  return function filterI(source: Observable<T>): Observable<T> {
    return observable<T, FilterContext<T>, FilterArg<T>>(
      filterProducer,
      filterContext,
      {
        predicate,
        source
      }
    );
  };
}

interface FilterArg<T> {
  predicate: (v: T) => boolean;
  source: Observable<T>;
}

interface FilterContext<T> {
  predicate: (v: T) => boolean;
  source: Observable<T>;
  sub: Subscription | undefined;
}

interface FilterSubContext<T> {
  predicate: (v: T) => boolean;
  observer: Observer<T>;
}

function filterContext<T>(arg: FilterArg<T>): FilterContext<T> {
  return {
    predicate: arg.predicate,
    source: arg.source,
    sub: undefined
  };
}

function filterProducer<T>(this: FilterContext<T>, observer: Observer<T>) {
  this.sub = this.source.subscribe(
    {
      next: filterNext,
      complete: filterComplete
    },
    {
      predicate: this.predicate,
      observer
    }
  );

  return filterCancel;
}

function filterCancel<T>(this: FilterContext<T>) {
  if (this.sub && !this.sub.closed) {
    this.sub.cancel();
  }
}

function filterNext<T>(this: FilterSubContext<T>, value: T) {
  if (this.predicate(value)) {
    return this.observer.next(value);
  }
}

function filterComplete<T>(this: FilterSubContext<T>) {
  return this.observer.complete();
}
