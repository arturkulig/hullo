import { flatMap } from "./flatMap";
import { ofMany } from "./ofMany";
import { pipe } from "../pipe";
import { timeout, resolved } from "../task";

it("flatMap", async () => {
  const results: number[] = [];
  await new Promise(r =>
    pipe(
      ofMany([[10, 40, 30], [20, 11, 22]]),
      flatMap((ns: number[]) => ofMany(ns))
    )({
      next: n => {
        results.push(n);
        return timeout(n);
      },
      complete: () => {
        r();
        return resolved;
      }
    })
  );
  expect(results).toEqual([10, 20, 11, 40, 30, 22]);
});
