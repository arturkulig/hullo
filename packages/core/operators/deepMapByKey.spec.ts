import { of } from "../of";
import { timeout } from "../timeout";
import { deepMapByKey } from "./deepMapByKey";
import { Observable, Subscription } from "../observable";

it("deepMapByKey", async () => {
  const results: { i?: number; k?: string; v?: number; c?: boolean }[] = [];
  const subs: { stream: Observable<any>; sub: Subscription }[] = [];
  const kAv0 = { k: "a", v: 0 };
  const kAv1 = { k: "a", v: 1 };
  const kBv0 = { k: "b", v: 0 };
  const kBv1 = { k: "b", v: 1 };
  of([[kAv0], [kBv0, kAv1], [kBv1, kAv1], [kAv1]])
    .pipe(deepMapByKey($ => $, ({ k }) => k))
    .subscribe({
      next: streams => {
        results.push({ i: -1 });
        streams.forEach(stream => {
          for (const sub of subs) {
            if (sub.stream === stream) {
              return;
            }
          }
          results.push({ k: (stream.valueOf() as any).k, c: false });
          subs.push({
            stream,
            sub: stream.subscribe({
              next: v => {
                results.push(v);
              },
              complete: () => {
                results.push({ k: (stream.valueOf() as any).k, c: true });
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
    { k: "a", c: false },
    { k: "a", v: 0 },
    //
    { k: "a", v: 1 },
    { i: -1 },
    { k: "b", c: false },
    { k: "b", v: 0 },
    //
    { k: "b", v: 1 },
    //
    { i: -1 },
    { k: "b", c: true },
    { i: -1, c: true },
    { k: "a", c: true }
  ]);
});
