import { Task } from "./Task";

describe("Task", () => {
  it(".map", () => {
    let calledTimes = 0;
    const task = new Task<number>(
      /** This is going to be a Task
       * so a `task`, `solution` or `future`.
       * However to not test any of those
       * together with `then`
       * it is stubbed with simplest Task possible... */
      consumer => {
        calledTimes++;
        consumer.resolve(2);
      }
    ).map(n => n * 2);
    let result: number[] = [];
    task.run(n => {
      result.push(n);
    });
    expect(result).toEqual([4]);
    expect(calledTimes).toBe(1);
  });
});
