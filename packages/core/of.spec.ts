import { timeout } from "./timeout";
import { of } from "./of";

describe("of", () => {
  it("unit", async () => {
    const result: number[] = [];
    of(1).subscribe({
      next: v => {
        result.push(v);
      }
    });
    await timeout(0);
    expect(result).toEqual([1]);
  });

  it("iterable", async () => {
    const result: number[] = [];
    of([1, 2, 3]).subscribe({
      next: v => {
        result.push(v);
      },
      complete: () => {
        result.push(-1);
      }
    });
    await timeout(0);
    expect(result).toEqual([1, 2, 3, -1]);
  });

  it("autoclosed disabled", async () => {
    const result: number[] = [];
    of([1, 2, 3], false).subscribe({
      next: v => {
        result.push(v);
      },
      complete: () => {
        result.push(-1);
      }
    });
    await timeout(0);
    expect(result).toEqual([1, 2, 3]);
  });
});
