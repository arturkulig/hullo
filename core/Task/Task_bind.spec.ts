import { Task } from "./Task";

describe("Task", () => {
  it(".bind", async () => {
    let result: number[] = [];

    Task.resolve(2)
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
  });
});
