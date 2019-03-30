import { filter } from "./filter";
import { timeout } from "../timeout";
import { of } from "../of";

it("filter", async () => {
  const results: number[] = [];
  of([1, 2, 3, 4, 5, 6, 7])
    .pipe(filter((n: number) => n % 2 === 0))
    .subscribe({
      next: v => {
        results.push(v);
      }
    });
  await timeout(0);
  expect(results).toEqual([2, 4, 6]);
});
