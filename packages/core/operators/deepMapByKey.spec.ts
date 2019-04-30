import { of } from "../of";
import { timeout } from "../timeout";
import { deepMapByKey } from "./deepMapByKey";
import { Observable, Subscription } from "../observable";

it("deepMapByKey", async () => {
  const results: { i?: number; k?: string; v?: number; evt: string }[] = [];
  const subs: { stream: Observable<any>; sub: Subscription }[] = [];
  const kAv0 = { k: "a", v: 0 };
  const kAv1 = { k: "a", v: 1 };
  const kBv0 = { k: "b", v: 0 };
  const kBv1 = { k: "b", v: 1 };
  of([[kAv0], [kBv0, kAv1], [kBv1, kAv1], [kAv1]])
    .pipe(deepMapByKey($ => $, ({ k }) => k))
    .subscribe({
      next: streams => {
        results.push({ i: -1, evt: "value" });
        streams.forEach(stream => {
          for (const sub of subs) {
            if (sub.stream === stream) {
              return;
            }
          }
          results.push({ k: (stream.valueOf() as any).k, evt: "track start" });
          subs.push({
            stream,
            sub: stream.subscribe({
              next: v => {
                results.push({ ...v, evt: "track value" });
              },
              complete: () => {
                results.push({
                  k: (stream.valueOf() as any).k,
                  evt: "track done"
                });
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
    // [kAv0],
    { evt: "value", i: -1 },
    { evt: "track start", k: "a" },
    { evt: "track value", k: "a", v: 0 },
    // [kBv0, kAv1],
    { evt: "value", i: -1 },
    { evt: "track start", k: "b" },
    { evt: "track value", k: "a", v: 1 },
    { evt: "track value", k: "b", v: 0 },
    // [kBv1, kAv1],
    { evt: "track value", k: "b", v: 1 },
    // [kAv1]
    { evt: "value", i: -1 },
    { evt: "track done", k: "b" },
    // EOF
    { evt: "done", i: -1 },
    { evt: "track done", k: "a" }
  ]);
});
