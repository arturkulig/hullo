import { flatMap } from "./flatMap";
import { Observable } from "../Observable";
import { timeout } from "../timeout";

it("flatMap", async () => {
  const results: number[] = [];
  await new Promise(r => {
    Observable.of([[100, 400, 300], [200, 110, 220]])
      .pipe(flatMap(ns => Observable.of(ns)))
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
