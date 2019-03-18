import { Task } from "./task";

export function timeout(interval = 0): Task<void> {
  return function timeout_task(consume: (v: void) => void) {
    const token = setTimeout(consume, interval);
    return function timeout_cancel() {
      clearTimeout(token);
    };
  };
}
