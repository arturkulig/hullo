import { of } from "../of";
import { timeout } from "../timeout";
import { deepMap } from "./deepMap";
import { Observable, Subscription } from "../observable";

it("deepMap", async () => {
  const results: { i: number; v?: number; c?: boolean }[] = [];
  const subs: { stream: Observable<number>; sub: Subscription }[] = [];
  of([[0], [0, 1], [1, 1], [10]])
    .pipe(deepMap(_ => _))
    .subscribe({
      next: streams => {
        results.push({ i: -1 });
        streams.forEach((stream, i) => {
          for (const sub of subs) {
            if (sub.stream === stream) {
              return;
            }
          }
          results.push({ i, c: false });
          subs.push({
            stream,
            sub: stream.subscribe({
              next: v => {
                results.push({ i, v });
              },
              complete: () => {
                results.push({ i, c: true });
              }
            })
          });
        });
      },
      complete() {
        results.push({ i: -1, c: true });
      }
    });
  await timeout(0);
  expect(results).toEqual([
    { i: -1 },
    { i: 0, c: false },
    { i: 0, v: 0 },
    { i: -1 },
    { i: 1, c: false },
    { i: 1, v: 1 },
    { i: 0, v: 1 },
    { i: 1, c: true },
    { i: -1 },
    { i: 0, v: 10 },
    { i: -1, c: true },
    { i: 0, c: true }
  ]);
});
