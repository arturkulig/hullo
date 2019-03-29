import { flatMap } from "./flatMap";
import { Observable } from "../Observable";
import { Timeout } from "../Task";

it("flatMap", async () => {
  const results: number[] = [];
  await new Promise(r => {
    Observable.of([[100, 400, 300], [200, 110, 220]])
      .pipe(flatMap(ns => Observable.of(ns)))
      .subscribe({
        next: n => {
          results.push(n);
          return new Timeout(n);
        },
        complete: r
      });
  });
  expect(results).toEqual([100, 400, 300, 200, 110, 220]);
});
