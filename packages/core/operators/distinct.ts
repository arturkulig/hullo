import {
  Subscription,
  Observable,
  Observer,
  ComplexProducer,
  Cancellation
} from "../observable";

export function distinctEqual<T>(source: Observable<T>): Observable<T> {
  return new Observable<T>(new DistinctProducer<T>(source, equal));
}

function equal<T>(p: T, n: T) {
  return p != n;
}

export function distinctStrictEqual<T>(source: Observable<T>): Observable<T> {
  return new Observable<T>(new DistinctProducer<T>(source, strictEqual));
}

function strictEqual<T>(p: T, n: T) {
  return p !== n;
}

export function distinct<T>(compare: (prev: T, next: T) => boolean) {
  return function distinctI(source: Observable<T>): Observable<T> {
    return new Observable<T>(new DistinctProducer<T>(source, compare));
  };
}

class DistinctProducer<T> implements ComplexProducer<T> {
  constructor(private source: Observable<T>, private compare: Comparator<T>) {}

  subscribe(observer: Observer<T>) {
    const sub = this.source.subscribe(
      new DistinctSourceObserver<T>(observer, this.compare)
    );
    return new DistinctCancel(sub);
  }
}

class DistinctCancel implements Cancellation {
  constructor(private sub: Subscription) {}
  cancel() {
    if (!this.sub.closed) {
      this.sub.cancel();
    }
  }
}

class DistinctSourceObserver<T> implements Observer<T> {
  get closed() {
    return this.outerObserver.closed;
  }
  last: { value: T } | null = null;

  constructor(
    private outerObserver: Observer<T>,
    private compare: Comparator<T>
  ) {}

  next(value: T) {
    if (this.last === null) {
      this.last = { value };
      return this.outerObserver.next(value);
    } else if (this.compare(this.last.value, value)) {
      this.last.value = value;
      return this.outerObserver.next(value);
    }
    return Promise.resolve();
  }

  complete() {
    return this.outerObserver.complete();
  }
}

interface Comparator<T> {
  (prev: T, next: T): boolean;
}
