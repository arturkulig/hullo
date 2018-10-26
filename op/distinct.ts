import { observable, subscribe } from "../core";

function defaultComparator<T>(p: T, n: T) {
  return p !== n;
}

export function* distinct<T>(
  items: Iterable<T>,
  comparator: (prev: T, next: T) => boolean = defaultComparator
): Iterable<T> {
  let last: null | { value: T } = null;
  for (const item of items) {
    if (last !== null) {
      if (comparator(last.value, item)) {
        yield item;
      }
      last.value = item;
    } else {
      yield item;
      last = { value: item };
    }
  }
}

export function distinct$<T>(
  items: AsyncIterable<T>,
  comparator: (prev: T, next: T) => boolean = defaultComparator
): AsyncIterable<T> {
  return observable<T>(observer => {
    let last: null | { value: T } = null;

    const sub = subscribe<T>(items, {
      next(item) {
        if (last !== null) {
          if (comparator(last.value, item)) {
            last.value = item;
            return observer.next(item);
          } else {
            last.value = item;
          }
        } else {
          last = { value: item };
          return observer.next(item);
        }
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
