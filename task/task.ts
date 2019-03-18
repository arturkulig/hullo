import { schedule } from "./schedule";

export interface Cancellation {
  (): void;
}

export interface Task<T = void> {
  (consume: Consumer<T>): Cancellation;
}

interface Consumer<T> {
  (value: T): void;
}

enum Resolution {
  none,
  done,
  cancelled
}

interface State<T> {
  producer: Task<T>;
  resolution: Resolution;
  consume: Consumer<T>;
  cancel: Cancellation;
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
    const state: State<T> = {
      producer,
      consume,
      resolution: Resolution.none,
      cancel: noop
    };

    schedule(task_runProducer, state, producer);

    return function task_cancel() {
      if (state.resolution === Resolution.none) {
        state.resolution = Resolution.cancelled;
        if (state.cancel && state.cancel !== resolve_noopCancel) {
          state.cancel();
        }
      }
    };
  };
}

function task_runProducer<T>(state: State<T>) {
  if (state.resolution === Resolution.none) {
    state.cancel = state.producer(task_resolve);
    if ((state as State<T>).resolution === Resolution.cancelled) {
      schedule(state.cancel);
    }
  }

  function task_resolve(result: T) {
    if (state.resolution === Resolution.none) {
      state.resolution = Resolution.done;
      schedule(state.consume, result);
    }
  }
}

function noop() {}

export function resolve(): Task<void>;
export function resolve<T>(v: T): Task<T>;
export function resolve<T>(...args: [] | [T]): Task<void> | Task<T> {
  if (args.length === 0) {
    return resolved;
  } else {
    const v = args[0];
    return task(function resolve_value_producer(consume: (value: T) => void) {
      schedule(consume, v);
      return resolve_noopCancel;
    });
  }
}

export const resolved = task(resolvedI);
function resolvedI(consume: (value: void) => void) {
  consume();
  return resolve_noopCancel;
}

function resolve_noopCancel() {
  return undefined;
}
