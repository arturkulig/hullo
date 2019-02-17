import { task, Task } from "./task";

export const then = <T, U>(f: (v: T) => U) => (aTask: Task<T>): Task<U> =>
  task<U>(consume => aTask(value => consume(f(value))));
