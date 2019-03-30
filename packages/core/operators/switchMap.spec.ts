import { switchMap } from "./switchMap";
import { observable } from "../observable";
import { timeout } from "../timeout";

it("switchMap", async () => {
  const results: number[] = [];
  await new Promise(r => {
    observable<number[]>(async observer => {
      await timeout(0);
      await observer.next([3, 400, 4]);
      await timeout(100);
      await observer.next([30, 100, 40]);
      await observer.complete();
    })
      .pipe(
        switchMap(([b, c, d]) =>
          observable<number>(async observer => {
            await observer.next(b);
            await timeout(c);
            await observer.next(d);
            await observer.complete();
          })
        )
      )
      .subscribe({
        next: n => {
          results.push(n);
        },
        complete: r
      });
  });
  expect(results).toEqual([3, 30, 40]);
});
