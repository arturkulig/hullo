import { observable, subscribe } from "../core";

export function* cumulate<T>(source: Iterable<T>) {
  let lastCumulation: T[] = [];
  for (const item of source) {
    yield (lastCumulation = lastCumulation.concat([item]));
  }
}

export function cumulate$<T>(source: AsyncIterable<T>) {
  return observable<T[]>(observer => {
    let lastCumulation: T[] = [];
    const sub = subscribe(source, {
      next(item) {
        return observer.next((lastCumulation = lastCumulation.concat([item])));
      },
      error: observer.error,
      complete: observer.complete
    });
    return () => {
      if (!sub.closed) {
        sub.unsubscribe();
      }
    };
  });
}
