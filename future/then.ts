import { Task } from "./task";

export function then<T, U>(f: (v: T) => U) {
  return function thenI(aTask: Task<T>): Task<U> {
    return consume => aTask(value => consume(f(value)));
  };
}
