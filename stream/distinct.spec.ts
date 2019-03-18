import { distinct, distinctEqual, distinctStrictEqual } from "./distinct";
import { ofMany } from "./ofMany";
import { resolved, resolve } from "../task";

describe("distinct", () => {
  it("custom", () => {
    const results: number[] = [];
    distinct<{ v: number }>((a, b) => a.v !== b.v)(
      ofMany([1, 3, 3, 4, 3, 3, 10].map(v => ({ v })))
    )({
      next: ({ v }) => {
        results.push(v);
        return resolved;
      },
      complete: resolve
    });
    expect(results).toEqual([1, 3, 4, 3, 10]);
  });

  it("sloppy equal", () => {
    const results: (number | string)[] = [];
    distinctEqual(ofMany([1, 3, "3", 4, 3, 3, 10]))({
      next: v => {
        results.push(v);
        return resolved;
      },
      complete: resolve
    });
    expect(results).toEqual([1, 3, 4, 3, 10]);
  });

  it("strict equal", () => {
    const results: (number | string)[] = [];
    distinctStrictEqual(ofMany([1, 3, "3", 4, 3, 3, 10]))({
      next: v => {
        results.push(v);
        return resolved;
      },
      complete: resolve
    });
    expect(results).toEqual([1, 3, "3", 4, 3, 10]);
  });
});
