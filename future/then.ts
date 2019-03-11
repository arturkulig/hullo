import { Task } from "./task";

/**
 * Creates a function that can be applied onto a Task
 * creating another Task
 * that resolves with transformed result of the original Task
 */
export function then<T, U>(f: (v: T) => U) {
  return function thenI(source: Task<T>): Task<U> {
    return function thenII(consume) {
      return source(value => consume(f(value)));
    };
  };
}
