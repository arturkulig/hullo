import { IObserver, Observable } from "../Observable/Observable";
import { state } from "./state";
import { timeout } from "../timeout";

describe("State", () => {
  it("regular", async () => {
    let remoteObserver: IObserver<number> = {
      next: _n => Promise.resolve(),
      complete: () => Promise.resolve()
    };
    const s = new Observable<number>(observer => {
      remoteObserver = observer;
      return () => {};
    }).pipe(state(0));

    const results: number[] = [];
    s.subscribe({
      next: v => {
        results.push(v);
      }
    });

    await timeout(100);

    Observable.of([1, 2, 4, 6]).subscribe(remoteObserver);

    await timeout(100);

    expect(results).toEqual([0, 1, 2, 4, 6]);
  });

  it("latter sub gets last value", async () => {
    const s = new Observable<number>(observer => {
      Observable.of([1, 2, 4, 6]).subscribe({
        next(v) {
          return observer.next(v);
        }
      });
    }).pipe(state(0));

    // first sub
    s.subscribe({});

    await timeout(100);

    // latter sub
    const results: number[] = [];
    s.subscribe({
      next: v => {
        results.push(v);
      }
    });

    await timeout(100);

    expect(results).toEqual([6]);
  });
});
