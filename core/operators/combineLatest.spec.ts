import { combineLatest } from "./combineLatest";
import { Observable } from "../Observable";
import { Timeout } from "../Task";

describe("combineLatest", () => {
  it("0 streams", async () => {
    const results: any[] = [];
    combineLatest([]).subscribe({
      next: v => {
        results.push(v);
      }
    });
    expect(results).toEqual([[]]);

    await new Promise(r => setTimeout(r));
  });

  it("1 input streams", async () => {
    const results: any[] = [];
    combineLatest([Observable.of(0)]).subscribe({
      next: v => {
        results.push(v);
      }
    });
    expect(results).toEqual([[0]]);
    await new Promise(r => setTimeout(r));
  });

  it("2+ input streams", async () => {
    const completion = [-1];
    const results: any[] = [];
    const sub = combineLatest<[number, number, number]>([
      new Observable<number>(observer => {
        observer
          .next(0)
          .bind(() => new Timeout(0))
          .run(() => observer.next(1));
      }),
      new Observable<number>(observer => {
        observer
          .next(2)
          .bind(() => new Timeout(10))
          .bind(() => observer.next(22))
          .run(() => observer.complete());
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

    await new Promise(r => setTimeout(r, 1000));

    expect(results).toEqual([[0, 2, 3], [1, 2, 3], [1, 22, 3], completion]);
    sub.cancel();

    await new Promise(r => setTimeout(r));
  });
});
