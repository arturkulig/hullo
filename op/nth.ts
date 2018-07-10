import { last } from "./last";
import { take, take$ } from "./take";

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
