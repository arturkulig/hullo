import { Task } from "./Task";

describe("Task", () => {
  it(".bind", async () => {
    let result: number[] = [];

    const exe = Task.resolve(2)
      .bind(
        n =>
          new Task<number>(consumer => {
            setTimeout(() => {
              consumer.resolve(n * 2);
            });
          })
      )
      .run(n => {
        result.push(n);
      });

    await new Promise(r => setTimeout(r));

    expect(result).toEqual([4]);
    expect(typeof exe).toBe("object");
    expect(typeof exe.cancel).toBe("function");
  });

  it(".bind cancels", async () => {
    let timerCalledTimes = 0;
    let postCalledTimes = 0;
    let postCancelCalledTimes = 0;
    let result: number[] = [];

    const exe = Task.resolve()
      .bind(
        () =>
          new Task<number>(consumer => {
            postCalledTimes++;
            const token = setTimeout(() => {
              timerCalledTimes++;
              consumer.resolve(2);
            }, 100);
            return () => {
              postCancelCalledTimes++;
              clearInterval(token);
            };
          })
      )
      .run(n => {
        result.push(n);
      });

    setTimeout(() => exe.cancel(), 10);

    await new Promise(r => setTimeout(r, 250));

    expect(timerCalledTimes).toBe(0);
    expect(postCalledTimes).toBe(1);
    expect(postCancelCalledTimes).toBe(1);
    expect(result).toEqual([]);
  });
});
