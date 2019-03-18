import { filter } from "./filter";
import { ofMany } from "./ofMany";
import { resolved, resolve } from "../task";

it("filter", () => {
  const results: number[] = [];
  filter((n: number) => n % 2 === 0)(ofMany([1, 2, 3, 4, 5, 6, 7]))({
    next: v => {
      results.push(v);
      return resolved;
    },
    complete: resolve
  });
  expect(results).toEqual([2, 4, 6]);
});
