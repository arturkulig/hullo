import { droppingBuffer } from "./droppingBuffer";
import { of } from "../of";
import { timeout } from "../timeout";

it("droppingBuffer", async () => {
  const source = of([1, 2, 3, 4, 5]).pipe(droppingBuffer(2));
  const result = await new Promise<number[]>(resolve => {
    const sink = new Array<number>();
    source.subscribe({
      next(v) {
        sink.push(v);
        return timeout(0);
      },
      complete() {
        resolve(sink);
      }
    });
  });
  expect(result).toEqual([1, 4, 5]);
});
