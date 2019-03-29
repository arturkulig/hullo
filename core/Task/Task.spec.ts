import { Task } from "./Task";

describe("Task", () => {
  it("simple", done => {
    const t = new Task<number>(consumer => {
      consumer.resolve(6);
    });
    t.run(n => {
      try {
        expect(n).toEqual(6);
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  it("resolve can be called once", () => {
    const t = new Task<number>(consumer => {
      consumer.resolve(6);
      consumer.resolve(7);
      return () => {};
    });
    const submitted = new Array<number>();
    t.run(n => {
      submitted.push(n);
    });
    expect(submitted).toEqual([6]);
  });

  it("resolves asynchronously", done => {
    const t = new Task<number>(consumer => {
      setTimeout(() => consumer.resolve(6), 10);
    });
    t.run(n => {
      try {
        expect(n).toEqual(6);
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  it("producer is called once despite subscriptions", () => {
    let times = 0;
    const t = new Task(() => {
      times++;
    });
    expect(times).toBe(1);
    t.run(() => {});
    expect(times).toBe(1);
    t.run(() => {});
    expect(times).toBe(1);
  });
});
