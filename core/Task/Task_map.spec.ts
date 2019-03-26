import { Task } from "./Task";

describe("Task", () => {
  it(".map", () => {
    let calledTimes = 0;
    const t = new Task<number>(
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
    const exe = t.run(n => {
      result.push(n);
    });
    expect(result).toEqual([4]);
    expect(typeof exe).toBe("object");
    expect(typeof exe.cancel).toBe("function");
    expect(exe.closed).toBe(true);
    expect(calledTimes).toBe(1);
  });
});
