export function reduce<T, RESULT>(
  accumulator: (result: RESULT, item: T, ordinal: number) => RESULT,
  initial: RESULT
) {
  return function sync(subject: Iterable<T>) {
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
  return async function async(subject: AsyncIterable<T>) {
    let ordinal = 0;
    let result: RESULT = initial;
    for await (const item of subject) {
      result = await accumulator(result, item, ordinal);
    }
    return result;
  };
}
