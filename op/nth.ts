import { last } from "./last";
import { take } from "./take";

export function nth(ordinal: number) {
  const takeAmount = take(ordinal);
  return nthOf;

  function nthOf<T>(subject: Iterable<T>): Iterable<T>;
  function nthOf<T>(subject: AsyncIterable<T>): AsyncIterable<T>;
  function nthOf<T>(subject: any) {
    return last<T>(takeAmount<T>(subject));
  }
}
