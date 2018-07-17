import { observable } from "../core/observable";
import { subscribe } from "../utils/subscribe";

export interface OrderedTransformer<T, U> {
  (value: T, ordinal: number): U;
}

export function map<T, U>(transformer: OrderedTransformer<T, U>) {
  return function* _map(subject: Iterable<T>) {
    let ordinal = 0;
    for (const item of subject) {
      yield transformer(item, ordinal++);
    }
  };
}

export function map$<T, U>(transformer: OrderedTransformer<T, Promise<U> | U>) {
  return function _map$(subject: AsyncIterable<T>) {
    return observable<U>(observer => {
      let ordinal = 0;
      const sub = subscribe(subject, {
        next(v) {
          const step = transformer(v, ordinal++);
          if (step instanceof Promise) {
            return step.then(observer.next);
          }
          return observer.next(step);
        }
      });
      return sub.unsubscribe;
    });
  };
}
