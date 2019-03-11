import { future } from "./future";

describe("future", () => {
  it("simple", done => {
    const t = future<number>(resolve => {
      resolve(6);
      return () => {};
    });
    t(n => {
      try {
        expect(n).toEqual(6);
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  it("resolve can be called once", () => {
    const t = future<number>(resolve => {
      resolve(6);
      resolve(7);
      return () => {};
    });
    const submitted = new Array<number>();
    t(n => {
      submitted.push(n);
    });
    expect(submitted).toEqual([6]);
  });

  it("resolves asynchronously", done => {
    const t = future<number>(resolve => {
      setTimeout(resolve, 10, 6);
      return () => {};
    });
    t(n => {
      try {
        expect(n).toEqual(6);
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  it("once cancelled cannot be resolved", done => {
    const t = future<number>(resolve => {
      setTimeout(resolve, 50, 6);
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
    const cancel = t(n => {
      submitted.push(n);
    });
    setTimeout(cancel, 10);
    setTimeout(() => {
      try {
        expect(submitted).toEqual([]);
        done();
      } catch (e) {
        done(e);
      }
    }, 100);
  });

  it("cancellation will be called once", () => {
    let times = 0;
    const t = future(() => {
      return () => {
        times++;
      };
    });
    const cancel = t(() => {});
    expect(times).toBe(0);
    cancel();
    cancel();
    expect(times).toBe(1);
  });

  it("producer is called asap, with no relation to result subscriptions", () => {
    let times = 0;
    const t = future(() => {
      times++;
      return () => {};
    });
    expect(times).toBe(1);
    const cancel1 = t(() => {});
    expect(times).toBe(1);
    const cancel2 = t(() => {});
    expect(times).toBe(1);
    cancel1();
    cancel2();
  });
});
