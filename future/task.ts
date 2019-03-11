import { schedule } from "./schedule";

export interface Cancellation {
  (): void;
}

export interface Task<T = void> {
  (consume: (value: T) => void): Cancellation;
}

enum Resolution {
  none,
  done,
  cancelled
}

/**
 * A function that creates a function that gets a function as an argument
 *
 * `task` function should be provided with *producer* function
 * that then should be run with *consumer* function as its argument.
 *
 * *Producer* is a function that gets a *consumer* function
 * and returns *cancelling* function.
 * *Consumer* function gets a value that *producer* submitted
 * and is called only once, despite how many times *producer* submits. It should return nothing.
 * *Cancelling* a task neutralizes *consumer* function provided to *producer*
 * but mentioned *cancelling* function
 * should cancel all jobs tied or leading to it being called.
 *
 * *Producer* function is called
 * every time a *consumer* callback is registered.
 *
 * Example:
 *
 * // create a task
 * const soonToBeTwo = task(resolve => {
 *   const token = setTimeout(() => { resolve(2) });
 *   return () => { clearTimeout(token); }
 * });
 *
 * // run a job specified in the task and subscribe for result
 * const cancel = soonToBeTwo(n => {
 *   console.log('number:' n);
 * });
 *
 * // cancel the job
 * cancel();
 */
export function task<T = void>(producer: Task<T>): Task<T> {
  return function task_task(consume) {
    let resolution = Resolution.none;

    const cancel = producer(function task_resolve(result) {
      if (resolution === Resolution.none) {
        resolution = Resolution.done;
        schedule(consume, result);
      }
    });

    return function task_cancel() {
      if (resolution === Resolution.none) {
        resolution = Resolution.cancelled;
        if (cancel) {
          schedule(cancel);
        }
      }
    };
  };
}

export function resolve(): Task<void>;
export function resolve<T>(v: T): Task<T>;
export function resolve<T>(...args: [] | [T]): Task<void> | Task<T> {
  if (args.length === 0) {
    return resolved;
  } else {
    return resolve_value_producer(args[0]);
  }
}
function resolve_value_producer<T>(v: T): Task<T> {
  return function resolve_value_producer(consume: (value: T) => void) {
    consume(v);
    return resolve_cancel;
  };
}

export function resolved(consume: (value: void) => void) {
  consume();
  return resolve_cancel;
}

function resolve_cancel() {
  return undefined;
}
