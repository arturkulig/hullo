import { then } from "./then";

describe("then", () => {
  it("works", () => {
    let calledTimes = 0;
    const twice = then<number, number>(n => n * 2);
    const t = twice(
      /** This is going to be a Task
       * so a `task`, `solution` or `future`.
       * However to not test any of those
       * together with `then`
       * it is stubbed with simplest Task possible... */
      r => {
        calledTimes++;
        r(2);
        return () => {};
      }
    );
    let result: null | { n: number } = null;
    const cancel = t(n => {
      result = { n };
    });
    expect(result).toEqual({ n: 4 });
    expect(typeof cancel).toBe("function");
    expect(calledTimes).toBe(1);
  });
});
