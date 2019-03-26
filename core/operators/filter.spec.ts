import { filter } from "./filter";
import { Observable } from "../Observable";

it("filter", () => {
  const results: number[] = [];
  Observable.of([1, 2, 3, 4, 5, 6, 7])
    .pipe(filter((n: number) => n % 2 === 0))
    .subscribe({
      next: v => {
        results.push(v);
      }
    });
  expect(results).toEqual([2, 4, 6]);
});
