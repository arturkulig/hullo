import { state } from "./state";
import { timeout } from "../timeout";
import { of } from "../of";
import { Observer, observable } from "../observable";

describe("State", () => {
  it("regular", async () => {
    let remoteObserver: Observer<number> = {
      next: _n => Promise.resolve(),
      complete: () => Promise.resolve()
    };
    const s = observable<number>(observer => {
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

    of([1, 2, 4, 6]).subscribe(remoteObserver);

    await timeout(100);

    expect(results).toEqual([0, 1, 2, 4, 6]);
  });

  it("when message is immediately released, default message is omitted from the output", async () => {
    const result: number[] = [];
    observable(observer => {
      observer.next(9);
    })
      .pipe(state(1))
      .subscribe({
        next: v => {
          result.push(v);
        }
      });
    expect(result).toEqual([9]);
  });

  it("latter sub gets last value", async () => {
    const s = observable<number>(observer => {
      of([1, 2, 4, 6]).subscribe({
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
