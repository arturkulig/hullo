import { observable, subscribe } from "../core";

export function* merge<T>(...iterables: Array<Iterable<T>>): Iterable<T> {
  for (const iterable of iterables) {
    for (const item of iterable) {
      yield item;
    }
  }
}

export function merge$<T>(
  ...iterables: Array<AsyncIterable<T>>
): AsyncIterable<T> {
  return observable(observer => {
    const subs = iterables.map((iterable: AsyncIterable<T>) =>
      subscribe(iterable, observer)
    );
    return () => {
      for (const sub of subs.splice(0)) {
        if (!sub.closed) {
          sub.unsubscribe();
        }
      }
    };
  });
}
