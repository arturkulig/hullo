import { subscribe } from "../utils/subscribe";

export function reduce<T, RESULT>(
  accumulator: (result: RESULT, item: T, ordinal: number) => RESULT,
  initial: RESULT
) {
  return function _reduce(subject: Iterable<T>) {
    let ordinal = 0;
    let result: RESULT = initial;
    for (const item of subject) {
      result = accumulator(result, item, ordinal);
    }
    return result;
  };
}

export function reduce$<T, RESULT>(
  accumulator: (
    result: RESULT,
    item: T,
    ordinal: number
  ) => Promise<RESULT> | RESULT,
  initial: RESULT
) {
  return function _reduce$(subject: AsyncIterable<T>) {
    let ordinal = 0;
    let result$: Promise<RESULT> = Promise.resolve(initial);
    return new Promise<RESULT>((resolve, reject) => {
      subscribe(subject, {
        next(value) {
          result$ = result$.then(result =>
            accumulator(result, value, ordinal++)
          );
          return (result$ as any) as Promise<void>;
        },
        error: reject,
        complete() {
          result$.then(resolve, reject);
        }
      });
    });
  };
}
