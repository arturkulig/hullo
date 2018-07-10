import { last } from "../op/last";
import { take, take$ } from "../op/take";

export function nth(ordinal: number) {
  const takeAmount = take(ordinal);
  return _nth;

  function _nth<T>(subject: Iterable<T>) {
    return last<T>(takeAmount<T>(subject));
  }
}

export function nth$(ordinal: number) {
  const takeAmount = take$(ordinal);
  return _nth$;

  async function _nth$<T>(subject: AsyncIterable<T>) {
    return last<T>(await takeAmount<T>(subject));
  }
}
