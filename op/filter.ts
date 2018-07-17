import { OrderedTransformer } from "../op/map";
import { observable } from "../core";
import { subscribe } from "../utils";

export function filter<T>(filter: OrderedTransformer<T, boolean>) {
  return function* _filter(subject: Iterable<T>): Iterable<T> {
    let ordinal = 0;
    for (const item of subject) {
      if (filter(item, ordinal++)) {
        yield item;
      }
    }
  };
}

export function filter$<T>(
  filter: OrderedTransformer<T, Promise<boolean> | boolean>
) {
  return function _filter$(subject: AsyncIterable<T>) {
    return observable<T>(observer => {
      let ordinal = 0;
      const sub = subscribe(subject, {
        next(item) {
          const condition = filter(item, ordinal++);
          if (condition instanceof Promise) {
            return condition.then(
              condition => (condition ? observer.next(item) : undefined)
            );
          }
          if (condition) {
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
  };
}
