import { IObserver, Observable } from "./Observable";
import { Task } from "../Task";
import { State } from "./State";

describe("State", () => {
  it("regular", () => {
    let remoteObserver: IObserver<number> = {
      next: _n => Task.resolved,
      complete: () => Task.resolved
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

    expect(results).toEqual([0, 1, 2, 4, 6]);
  });

  it("latter sub gets last value", () => {
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

    // latter sub
    const results: number[] = [];
    state.subscribe({
      next: v => {
        results.push(v);
      }
    });

    expect(results).toEqual([6]);
  });
});
