import { state } from "./state";
import { ofMany } from "./ofMany";
import { resolve, resolved } from "../task";

describe("state", () => {
  it("regular", () => {
    const s = state(0)(ofMany([1, 2, 4, 6]));

    const results: number[] = [];
    s({
      next: v => {
        results.push(v);
        return resolved;
      },
      complete: resolve
    });

    expect(results).toEqual([1, 2, 4, 6]);
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
