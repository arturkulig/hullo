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

export function task<T = void>(producer: Task<T>): Task<T> {
  return consume => {
    let resolution = Resolution.none;

    const cancel = producer(result => {
      if (resolution === Resolution.none) {
        resolution = Resolution.done;
        schedule(consume, result);
      }
    });

    return () => {
      if (resolution === Resolution.none) {
        resolution = Resolution.cancelled;
        if (cancel) {
          cancel();
        }
      }
    };
  };
}

export function resolve(): Task<void>;
export function resolve<T>(v: T): Task<T>;
export function resolve<T>(...args: [] | [T]) {
  if (args.length === 0) {
    return task<void>(consume => {
      consume();
      return () => undefined;
    });
  } else {
    return task<T>(consume => {
      consume(args[0]);
      return () => undefined;
    });
  }
}

export const resolved = resolve();
