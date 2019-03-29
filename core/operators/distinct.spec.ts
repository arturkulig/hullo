import { distinct, distinctEqual, distinctStrictEqual } from "./distinct";
import { Observable } from "../Observable";
import { timeout } from "../timeout";

describe("distinct", () => {
  it("custom", async () => {
    const results: number[] = [];
    Observable.of([1, 3, 3, 4, 3, 3, 10].map(v => ({ v })))
      .pipe(distinct<{ v: number }>((a, b) => a.v !== b.v))
      .subscribe({
        next: ({ v }) => {
          results.push(v);
        }
      });
    await timeout(0);
    expect(results).toEqual([1, 3, 4, 3, 10]);
  });

  it("sloppy equal", async () => {
    const results: (number | string)[] = [];
    Observable.of([1, 3, "3", 4, 3, 3, 10])
      .pipe(distinctEqual)
      .subscribe({
        next: v => {
          results.push(v);
        }
      });
    await timeout(0);
    expect(results).toEqual([1, 3, 4, 3, 10]);
  });

  it("strict equal", async () => {
    const results: (number | string)[] = [];
    Observable.of([1, 3, "3", 4, 3, 3, 10])
      .pipe(distinctStrictEqual)
      .subscribe({
        next: v => {
          results.push(v);
        }
      });
    await timeout(0);
    expect(results).toEqual([1, 3, "3", 4, 3, 10]);
  });
});
