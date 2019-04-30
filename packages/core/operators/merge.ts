import {
  Observable,
  Observer,
  Subscription,
  ComplexProducer,
  Cancellation
} from "../observable";

export function merge<T, U = T>(...others: Observable<T>[]) {
  return function mergeI(source: Observable<U>): Observable<T | U> {
    return new Observable<T | U>(new MergeProducer<T | U>([source, ...others]));
  };
}

class MergeProducer<T> implements ComplexProducer<T> {
  constructor(private sources: Observable<T>[]) {}

  subscribe(observer: Observer<T>) {
    const completions: Array<(() => any) | null> = this.sources.map(() => null);
    const subs = this.sources.map((source, i) =>
      source.subscribe(new MergeSourceObserver(i, completions, observer))
    );

    return new MergeCancel(subs);
  }
}

class MergeSourceObserver<T> {
  get closed() {
    return this.observer.closed;
  }

  constructor(
    private i: number,
    private completions: Array<(() => any) | null>,
    private observer: Observer<T>
  ) {}

  next(value: T) {
    return this.observer.closed ? Promise.resolve() : this.observer.next(value);
  }

  complete() {
    return new Promise(resolve => {
      this.completions[this.i] = resolve;
      for (const c of this.completions) {
        if (!c) {
          return;
        }
      }
      for (const c of this.completions) {
        if (c) {
          c();
        }
      }
    });
  }
}

class MergeCancel implements Cancellation {
  constructor(private subs: Subscription[]) {}

  cancel() {
    for (const sub of this.subs) {
      if (!sub.closed) {
        sub.cancel();
      }
    }
  }
}
