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

  it("once cancelled cannot be resolved", async () => {
    const t = new Task<number>(consumer => {
      setTimeout(() => consumer.resolve(6), 100);
      return () => {
        /**
         * The test is about not really cancelling the resolve
         * and proving that `resolve` function becomes numb.
         * Therefore this should not cancel the timeout
         * event though in real app that should be the case.
         */
      };
    });
    const submitted = new Array<number>();
    const sub = t.run(n => {
      submitted.push(n);
    });

    await new Promise(r => setTimeout(r, 10));
    sub.cancel();

    await new Promise(r => setTimeout(r, 200));
    expect(submitted).toEqual([]);
  });

  it("cancellation will be called once", () => {
    let times = 0;
    const t = new Task(() => {
      return () => {
        times++;
      };
    });
    const sub = t.run(() => {});
    expect(times).toBe(0);
    sub.cancel();
    sub.cancel();
    expect(times).toBe(1);
  });

  it("producer is called with every result subscription", () => {
    let times = 0;
    const t = new Task(() => {
      times++;
    });
    expect(times).toBe(0);
    const sub1 = t.run(() => {});
    expect(times).toBe(1);
    const sub2 = t.run(() => {});
    expect(times).toBe(2);
    sub1.cancel();
    sub2.cancel();
  });
});
