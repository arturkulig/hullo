import { groupingBuffer } from "./groupingBuffer";
import { Observable } from "../Observable";
import { timeout } from "../timeout";

describe("groupingBuffer", () => {
  it("different min max", async () => {
    const source = new Observable<number>(async observer => {
      await observer.next(1);
      await timeout(10);
      await observer.next(2);
      await timeout(10);
      await observer.next(3);
      await observer.next(4);
      await observer.next(5);
      await observer.next(6);
      await timeout(10);
      await observer.next(7);
      await observer.complete();
    }).pipe(groupingBuffer(2, 3));

    const result = await new Promise<number[][]>(resolve => {
      const sink = new Array<number[]>();
      source.subscribe({
        next(v) {
          sink.push(v);
          return timeout(100);
        },
        complete() {
          resolve(sink);
        }
      });
    });

    expect(result).toEqual([[1, 2], [3, 4, 5], [6, 7]]);
  });

  it("same min max", async () => {
    const source = new Observable<number>(async observer => {
      await observer.next(1);
      await timeout(10);
      await observer.next(2);
      await timeout(10);
      await observer.next(3);
      await observer.next(4);
      await observer.next(5);
      await observer.next(6);
      await timeout(10);
      await observer.next(7);
      await observer.complete();
    }).pipe(groupingBuffer(3));

    const result = await new Promise<number[][]>(resolve => {
      const sink = new Array<number[]>();
      source.subscribe({
        next(v) {
          sink.push(v);
          return timeout(100);
        },
        complete() {
          resolve(sink);
        }
      });
    });

    expect(result).toEqual([[1, 2, 3], [4, 5, 6]]);
  });
});
