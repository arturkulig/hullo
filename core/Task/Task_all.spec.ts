import { Task } from "./Task";
import { Timeout } from "./Timeout";

describe("Task", () => {
  it("0-length argument", () => {
    Task.all([]).run(v => {
      expect(v).toEqual([]);
    });
  });

  it("1-length argument", () => {
    Task.all([Task.resolve(1)]).run(v => {
      expect(v).toEqual([1]);
    });
  });

  it("2+ length argument", done => {
    Task.all([
      Task.resolve(1),
      new Timeout(100).map(() => 2),
      new Timeout(100).map(() => 3)
    ]).run(v => {
      try {
        expect(v).toEqual([1, 2, 3]);
        done();
      } catch (e) {
        done(e);
      }
    });
  });
});
