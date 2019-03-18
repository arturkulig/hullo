import { Task, resolve } from "./task";

export function commit<T>(t: Task<T>) {
  return t(resolve);
}
