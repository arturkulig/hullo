import { observable, Observable, Observer, Subscription } from "../observable";

export function scan<T, U>(
  accumulate: (accumulator: U, item: T) => U,
  start: U
) {
  return function scanI(source: Observable<T>): Observable<U> {
    return observable<U, ScanContext<T, U>, ScanArg<T, U>>(
      scanProduce,
      scanContext,
      { source, accumulate, start }
    );
  };
}

interface ScanArg<T, U> {
  source: Observable<T>;
  accumulate: (accumulator: U, item: T) => U;
  start: U;
}

interface ScanContext<T, U> {
  source: Observable<T>;
  sourceSub: Subscription | null;
  targetObserver: Observer<U> | null;
  accumulate: (accumulator: U, item: T) => U;
  last: U;
}

function scanContext<T, U>(arg: ScanArg<T, U>): ScanContext<T, U> {
  return {
    source: arg.source,
    accumulate: arg.accumulate,
    last: arg.start,
    sourceSub: null,
    targetObserver: null
  };
}

function scanProduce<T, U>(this: ScanContext<T, U>, observer: Observer<U>) {
  this.targetObserver = observer;
  this.sourceSub = this.source.subscribe(new ScanObserver(this));

  return scanCancel;
}

class ScanObserver<T, U> implements Observer<T> {
  constructor(private _context: ScanContext<T, U>) {}

  next(value: T) {
    this._context.last = this._context.accumulate(this._context.last, value);
    return this._context.targetObserver!.next(this._context.last);
  }

  complete() {
    return this._context.targetObserver!.complete();
  }
}

function scanCancel<T, U>(this: ScanContext<T, U>) {
  if (this.sourceSub) {
    const { sourceSub } = this;
    this.sourceSub = null;
    if (!sourceSub.closed) {
      sourceSub.cancel();
    }
  }
}
