import { combineLatest } from "./combineLatest";
import { timeout } from "./timeout";
import { of } from "./of";
import { Observable } from "./Observable";

describe("combineLatest", () => {
  it("0 streams", async () => {
    const results: any[] = [];
    combineLatest([]).subscribe({
      next: v => {
        results.push(v);
      }
    });
    await timeout(0);
    expect(results).toEqual([[]]);
  });

  it("1 input streams", async () => {
    const results: any[] = [];
    combineLatest([of(0)]).subscribe({
      next: v => {
        results.push(v);
      },
      complete: () => {
        results.push(-1);
      }
    });
    await timeout(0);
    expect(results).toEqual([[0], -1]);
  });

  it("2+ input streams", async () => {
    const completion = [-1];
    const results: any[] = [];
    const sub = combineLatest<[number, number, number]>([
      new Observable<number>(observer => {
        observer
          .next(0)
          .then(() => timeout(0))
          .then(() => observer.next(1));
      }),
      new Observable<number>(observer => {
        observer
          .next(2)
          .then(() => timeout(10))
          .then(() => observer.next(22))
          .then(() => observer.complete());
      }),
      new Observable<number>(observer => {
        observer.next(3);
      })
    ]).subscribe({
      next: v => {
        results.push(v);
      },
      complete: () => {
        results.push(completion);
      }
    });

    await timeout(1000);

    expect(results).toEqual([[0, 2, 3], [1, 2, 3], [1, 22, 3], completion]);
    sub.cancel();

    await timeout(0);
  });
});
