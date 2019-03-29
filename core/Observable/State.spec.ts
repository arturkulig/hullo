import { IObserver, Observable } from "./Observable";
import { State } from "./State";
import { timeout } from "../timeout";

describe("State", () => {
  it("regular", async () => {
    let remoteObserver: IObserver<number> = {
      next: _n => Promise.resolve(),
      complete: () => Promise.resolve()
    };
    const state = new State(
      new Observable<number>(observer => {
        remoteObserver = observer;
        return () => {};
      }),
      0
    );

    const results: number[] = [];
    state.subscribe({
      next: v => {
        results.push(v);
      }
    });

    Observable.of([1, 2, 4, 6]).subscribe(remoteObserver);

    await timeout(100);

    expect(results).toEqual([0, 1, 2, 4, 6]);
  });

  it("latter sub gets last value", async () => {
    const state = new State(
      new Observable<number>(observer => {
        Observable.of([1, 2, 4, 6]).subscribe({
          next(v) {
            return observer.next(v);
          }
        });
      }),
      0
    );

    // first sub
    state.subscribe({});

    await timeout(100);

    // latter sub
    const results: number[] = [];
    state.subscribe({
      next: v => {
        results.push(v);
      }
    });

    await timeout(100);

    expect(results).toEqual([6]);
  });
});
