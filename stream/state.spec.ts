import { state } from "./state";
import { ofMany } from "./ofMany";
import { resolve, resolved } from "../task";
import { Observer } from "./observable";

describe("state", () => {
  it("regular", () => {
    let remoteObserver: Observer<number> = {
      next: _n => resolved,
      complete: resolve
    };
    const s = state(0)(observer => {
      remoteObserver = observer;
      return () => {};
    });

    const results: number[] = [];
    s({
      next: v => {
        results.push(v);
        return resolved;
      },
      complete: resolve
    });

    ofMany([1, 2, 4, 6])(remoteObserver);

    expect(results).toEqual([0, 1, 2, 4, 6]);
  });

  it("latter sub gets last value", () => {
    const s = state(0)(observer => {
      return ofMany([1, 2, 4, 6])({ next: observer.next, complete: resolve });
    });

    // first sub
    s({
      next: resolve,
      complete: resolve
    });

    // latter sub
    const results: number[] = [];
    s({
      next: v => {
        results.push(v);
        return resolved;
      },
      complete: resolve
    });

    expect(results).toEqual([6]);
  });
});
