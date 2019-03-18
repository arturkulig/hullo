import { observable } from "./observable";
import { resolved, then2, commit, timeout, resolve } from "../task";
import { pipe } from "../pipe";

describe("observable", () => {
  it("sends one message", () => {
    const o = observable<number>(observer => {
      observer.next(6);
      return noop;
    });
    let result = 0;
    o({
      next: n => {
        result = n;
        return resolved;
      },
      complete: resolve
    });
    expect(result).toBe(6);
  });

  it("sends two messages", () => {
    const o = observable<number>(observer => {
      return pipe(
        resolved,
        then2(() => observer.next(6)),
        then2(() => observer.next(7)),
        then2(() => observer.complete()),
        commit
      );
    });
    let results = new Array<number>();
    o({
      next: n => {
        results.push(n);
        return resolved;
      },
      complete: resolve
    });
    expect(results).toEqual([6, 7]);
  });

  it("cancels", async () => {
    const o = observable<number>(observer => {
      return pipe(
        timeout(0),
        then2(() => observer.next(6)),
        then2(() => observer.next(7)),
        then2(() => observer.complete()),
        commit
      );
    });
    let results = new Array<number>();
    const cancel = o({
      next: n => {
        results.push(n);
        cancel();
        return resolved;
      },
      complete: () => resolved
    });
    await new Promise(r => setTimeout(r, 10));
    expect(results).toEqual([6]);
    await new Promise(r => setTimeout(r));
  });
});

function noop() {}
