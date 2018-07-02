import { isIterable } from "../utils";
import { observable, subscribe } from "../observable";

export function merge<T, U>(
  subject: Iterable<T>,
  ...others: Array<Iterable<U>>
): Iterable<T | U>;
export function merge<T, U>(
  subject: AsyncIterable<T>,
  ...others: Array<AsyncIterable<U>>
): AsyncIterable<T | U>;
export function merge<T, U>(
  subject: Iterable<T> | AsyncIterable<T>,
  ...others: Array<Iterable<U> | AsyncIterable<U>>
): Iterable<T | U> | AsyncIterable<T | U> {
  const areAllIterables = [subject, ...others].reduce(
    (r, i) => r && isIterable(i),
    true
  );
  if (areAllIterables) {
    return mergeSync<T | U>(
      subject as Iterable<T>,
      ...(others as Array<Iterable<U>>)
    );
  } else {
    return mergeAsync<T | U>(
      subject as AsyncIterable<T>,
      ...(others as Array<AsyncIterable<U>>)
    );
  }
}

function* mergeSync<T>(...iterables: Array<Iterable<T>>): Iterable<T> {
  for (const iterable of iterables) {
    for (const item of iterable) {
      yield item;
    }
  }
}

function mergeAsync<T>(
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
