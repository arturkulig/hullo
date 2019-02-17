import { task, Task, Cancellation } from "./task";

export { all };

type AllIn<T> = { [id in keyof T]: Task<T[id]> };
type AllOut<T> = Task<T>;

function all<T extends Array<any>>(tasks: AllIn<T>): AllOut<T> {
  return task<T>(consume => {
    const results = tasks.map(
      (): { result: null | { value: any }; cancel: Cancellation } => ({
        result: null,
        cancel: () => {}
      })
    );

    tasks.forEach((task, i) => {
      results[i]!.cancel = task(value => {
        results[i].result = { value };

        for (const entry of results) {
          if (entry.result === null) {
            return;
          }
        }

        consume(results.map(_ => _.result!.value) as T);
      });
    });

    return () => {
      results.forEach(entry => entry.cancel);
    };
  });
}
