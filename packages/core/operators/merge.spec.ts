import { of } from "../of";
import { timeout } from "../timeout";
import { merge } from "./merge";

it("merge", async () => {
  const result: number[] = [];
  of([1, 2])
    .pipe(merge(of([4, 5])))
    .subscribe({
      next: v => {
        result.push(v);
      }
    });
  await timeout(0);
  expect(result).toEqual([1, 4, 2, 5]);
});
