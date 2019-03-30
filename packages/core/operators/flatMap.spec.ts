import { flatMap } from "./flatMap";
import { timeout } from "../timeout";
import { of } from "../of";

it("flatMap", async () => {
  const results: number[] = [];
  await new Promise(r => {
    of([[100, 400, 300], [200, 110, 220]])
      .pipe(flatMap(ns => of(ns)))
      .subscribe({
        next: n => {
          results.push(n);
          return timeout(n);
        },
        complete: r
      });
  });
  expect(results).toEqual([100, 400, 300, 200, 110, 220]);
});
