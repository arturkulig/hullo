import { then2 } from "./then2";

describe("then2", () => {
  it("works", async () => {
    let calledTimes = 0;
    let result: null | { n: number } = null;

    const twice = then2<number, number>(n => r => {
      const token = setTimeout(r, 10, n * 2);
      return () => {
        clearTimeout(token);
      };
    });
    const t = twice(
      /** This is going to be a Task
       * so a `task`, `solution` or `future`.
       * However to not test any of those
       * together with `then2`
       * it is stubbed with simplest Task possible... */
      r => {
        calledTimes++;
        r(2);
        return () => {};
      }
    );
    const cancel = t(n => {
      result = { n };
    });

    await new Promise(r => setTimeout(r, 20));

    expect(result).toEqual({ n: 4 });
    expect(typeof cancel).toBe("function");
    expect(calledTimes).toBe(1);
  });

  it("cancels", async () => {
    let sourceCalledTimes = 0;
    let sourceCancelCalledTimes = 0;
    let postCalledTimes = 0;
    let postCancelCalledTimes = 0;
    let result: null | { n: number } = null;

    const twice = then2<number, number>(n => r => {
      postCalledTimes++;
      const token = setTimeout(r, 20, n * 2);
      return function cancelTwice() {
        postCancelCalledTimes++;
        clearTimeout(token);
      };
    });
    const t = twice(
      /** This is going to be a Task
       * so a `task`, `solution` or `future`.
       * However to not test any of those
       * together with `then2`
       * it is stubbed with simplest Task possible... */
      r => {
        sourceCalledTimes++;
        r(2);
        return function cancelSource() {
          sourceCancelCalledTimes++;
        };
      }
    );
    const cancel = t(n => {
      result = { n };
    });

    setTimeout(cancel, 10);

    await new Promise(r => setTimeout(r, 30));

    expect(sourceCalledTimes).toBe(1);
    expect(sourceCancelCalledTimes).toBe(0);
    expect(postCalledTimes).toBe(1);
    expect(postCancelCalledTimes).toBe(1);
    expect(result).toEqual(null);
  });
});
