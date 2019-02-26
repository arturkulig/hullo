import { task, Task } from "./task";

export function then<T, U>(f: (v: T) => U) {
  return function thenI(aTask: Task<T>): Task<U> {
    return task<U>(function thenII(consume) {
      return aTask(value => consume(f(value)));
    });
  };
}
