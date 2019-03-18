import { combineLatest } from "./combineLatest";
import { Observer } from "./observable";
import { resolved, resolve, commit, then2, timeout } from "../task";
import { pipe } from "../pipe/pipe";

describe("combineLatest", () => {
  it("no input streams", async () => {
    const results: any[] = [];
    const cancel = combineLatest([])({
      next: v => {
        results.push(v);
        return resolved;
      },
      complete: resolve
    });
    expect(results).toEqual([[]]);
    cancel();

    await new Promise(r => setTimeout(r));
  });

  it("single input streams", async () => {
    const results: any[] = [];
    const cancel = combineLatest([
      (observer: Observer<number>) => {
        return observer.next(0)(() => {});
      }
    ])({
      next: v => {
        results.push(v);
        return resolved;
      },
      complete: resolve
    });
    expect(results).toEqual([[0]]);
    cancel();
    await new Promise(r => setTimeout(r));
  });

  it("multiple input streams", async () => {
    const results: any[] = [];
    const cancel = combineLatest([
      (observer: Observer<number>) => {
        return pipe(
          observer.next(0),
          then2(() => timeout(0)),
          then2(() => observer.next(1)),
          commit
        );
      },
      (observer: Observer<number>) => {
        return observer.next(2)(() => {});
      },
      (observer: Observer<number>) => {
        return observer.next(3)(() => {});
      }
    ])({
      next: v => {
        results.push(v);
        return resolved;
      },
      complete: resolve
    });
    await new Promise(r => setTimeout(r, 10));
    expect(results).toEqual([[0, 2, 3], [1, 2, 3]]);
    cancel();
    await new Promise(r => setTimeout(r));
  });
});
