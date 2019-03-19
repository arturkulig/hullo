import { buffer } from "./buffer";
import { Observer } from "./observable";
import { pipe } from "../pipe";
import { then2, commit, resolve, timeout } from "../task";
import { ofMany } from "./ofMany";

describe("buffer", () => {
  it("bypasses single message at the time", async () => {
    const source = buffer(ofMany([6, 7, 8, 9, 10]));

    const result = new Array<number>();

    source({
      next: n => {
        result.push(n);
        return timeout(0);
      },
      complete: resolve
    });

    await new Promise(r => setTimeout(r, 20));

    expect(result).toEqual([6, 7, 8, 9, 10]);

    await new Promise(r => setTimeout(r));
  });

  it("queues messages and resolves delivery upon all messages being delivered", async () => {
    const source = buffer((observer: Observer<number>) => {
      pipe(
        observer.next(10),
        then2(() => observer.next(1)),
        then2(() => observer.next(2)),
        commit
      );
      observer.next(20);
      return () => {};
    });

    const result = new Array<number>();

    source({
      next: n => {
        result.push(n);
        return timeout(n);
      },
      complete: resolve
    });

    await new Promise(r => setTimeout(r, 100));

    expect(result).toEqual([10, 20, 1, 2]);
    /* if it would be resolving sending each message
       instead of after clearing out the buffer
       the result would be 10,1,2,20 */

    await new Promise(r => setTimeout(r));
  });
});
