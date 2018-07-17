import { observable } from "../core";
import { subscribe } from "../utils";

export function scan<T, RESULT>(
  accumulator: (result: RESULT, item: T, ordinal: number) => RESULT,
  initial: RESULT
) {
  return function* _scan(subject: Iterable<T>) {
    let ordinal = 0;
    let result: RESULT = initial;
    for (const item of subject) {
      result = accumulator(result, item, ordinal++);
      yield result;
    }
  };
}

export function scan$<T, RESULT>(
  accumulator: (
    result: RESULT,
    item: T,
    ordinal: number
  ) => Promise<RESULT> | RESULT,
  initial: RESULT
) {
  return function _scan$(subject: AsyncIterable<T>) {
    let ordinal = 0;
    let result: RESULT = initial;

    return observable<RESULT>(observer => {
      const sub = subscribe(subject, {
        async next(item) {
          result = await accumulator(result, item, ordinal);
          await observer.next(result);
        },
        error: observer.error,
        complete: observer.complete
      });
      return sub.unsubscribe;
    });
  };
}
