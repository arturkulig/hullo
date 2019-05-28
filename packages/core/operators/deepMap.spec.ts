import { of } from "../of";
import { timeout } from "../timeout";
import { deepMap } from "./deepMap";
import { Observable, Subscription } from "../Observable";

it("deepMap", async () => {
  const results: { i: number; v?: number; evt: string }[] = [];
  const subs: { stream: Observable<number>; sub: Subscription }[] = [];
  of([[0], [0, 1], [1, 1], [10]])
    .pipe(deepMap(_ => _))
    .subscribe({
      next: streams => {
        results.push({ i: -1, evt: "value" });
        streams.forEach((stream, i) => {
          for (const sub of subs) {
            if (sub.stream === stream) {
              return;
            }
          }
          results.push({ i, evt: "track start" });
          subs.push({
            stream,
            sub: stream.subscribe({
              next: v => {
                results.push({ i, v, evt: "track value" });
              },
              complete: () => {
                results.push({ i, evt: "track done" });
              }
            })
          });
        });
      },
      complete() {
        results.push({ i: -1, evt: "done" });
      }
    });
  await timeout(0);
  expect(results).toEqual([
    // [0]
    { evt: "value", i: -1 },
    { evt: "track start", i: 0 },
    { evt: "track value", i: 0, v: 0 },
    // [0, 1],
    { evt: "value", i: -1 },
    { evt: "track start", i: 1 },
    { evt: "track value", i: 1, v: 1 },
    // [1, 1],
    { evt: "track value", i: 0, v: 1 },
    // [10]
    { evt: "value", i: -1 },
    { evt: "track value", i: 0, v: 10 },
    { evt: "track done", i: 1 },
    // EOF
    { evt: "done", i: -1 },
    { evt: "track done", i: 0 }
  ]);
});
