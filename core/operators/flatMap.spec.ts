import { flatMap } from "./flatMap";
import { Observable } from "../Observable";

it("flatMap", async () => {
  const results: number[] = [];
  await new Promise(r => {
    Observable.of([[10, 40, 30], [20, 11, 22]])
      .pipe(flatMap(ns => Observable.of(ns)))
      .subscribe({
        next: n => {
          results.push(n);
        },
        complete: r
      });
  });
  expect(results).toEqual([10, 20, 40, 11, 30, 22]);
});
