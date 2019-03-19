import { Task, resolve, Cancellation, resolved } from "./task";
import { pipe } from "../pipe/pipe";
import { then } from "./then";
import { schedule } from "./schedule";

export { all };

type AllIn<T> = { [id in keyof T]: Task<T[id]> };
type AllOut<T> = Task<T>;

enum State {
  waiting,
  resolved,
  cancelled
}

const resolvedWithAnEmptyArray = resolve([]);
function all<T extends Array<any>>(tasks: AllIn<T>): AllOut<T> {
  if (tasks.length === 0) {
    return (resolvedWithAnEmptyArray as any) as AllOut<T>;
  }
  if (tasks.length === 1) {
    return pipe(
      tasks[0],
      then<any, T>(wrap1WithArray)
    );
  }
  return function all_I2(consume) {
    let state: State = State.waiting;
    const oks = tasks.map(() => false);
    const results = tasks.map(() => null as (null | T[keyof T]));
    const cancels = tasks.map(() => null as (null | Cancellation));

    if (tasks.length) {
      const { length } = tasks;
      for (let i = 0; i < length; i++) {
        const singleTask = tasks[i];
        if (singleTask === resolved) {
          oks[i] = true;
          results[i] = undefined as any;
          cancels[i] = null;
        } else {
          cancels[i] = singleTask(function all_claimExecutionValue(value) {
            if (!oks[i]) {
              oks[i] = true;
              results[i] = value;
              cancels[i] = null;

              if (state === State.waiting && oks.indexOf(false) < 0) {
                state = State.resolved;
                schedule(consume, []);
              }
            }
          });
        }
      }
    }

    if (state === State.waiting && oks.indexOf(false) < 0) {
      state = State.resolved;
      schedule(consume, []);
    }

    return function all_cancel() {
      state = State.cancelled;
      for (const cancel of cancels) {
        if (cancel) {
          schedule(cancel);
        }
      }
    };
  };
}

function wrap1WithArray<T>(value: any): any {
  return [value] as [T];
}
