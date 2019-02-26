import { Task, Cancellation, resolve } from "./task";

export { all };

type AllIn<T> = { [id in keyof T]: Task<T[id]> };
type AllOut<T> = Task<T>;

enum State {
  waiting,
  resolved,
  cancelled
}

function all<T extends Array<any>>(tasks: AllIn<T>): AllOut<T> {
  if (tasks.length === 0) {
    return resolve<T>(([] as any) as T);
  }
  if (tasks.length === 1) {
    return function all_I1(consume) {
      return tasks[0](value => consume([value] as T));
    };
  }
  return consume => {
    let state: State = State.waiting;
    let leftToResolve: number = tasks.length;

    const allExecutions = tasks.map(
      (): { result: null | { value: any }; cancel: Cancellation } => ({
        result: null,
        cancel: () => {}
      })
    );

    function all_tryResolve() {
      if (state !== State.waiting) {
        return true;
      }
      if (leftToResolve > 0) {
        return false;
      }
      consume(allExecutions.map(function all_formulateFinal(execution) {
        return execution.result!.value;
      }) as T);
      return true;
    }

    if (!all_tryResolve()) {
      for (let i = 0; i < tasks.length; i++) {
        const execution = allExecutions[i];
        const singleTask = tasks[i];
        execution.cancel = singleTask(function all_claimExecutionValue(value) {
          if (!execution.result) {
            execution.result = { value };
            leftToResolve--;
            all_tryResolve();
          }
        });
      }
    }

    return function all_cancel() {
      for (const result of allExecutions) {
        result.cancel();
      }
    };
  };
}
