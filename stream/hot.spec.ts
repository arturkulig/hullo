import { hot } from "./hot";
import { Observer } from "./observable";
import { pipe } from "../pipe";
import { resolve, then2, timeout, then } from "../task";

it("hot", async () => {
  const sent: number[] = [];
  const results: number[] = [];

  let remoteObserver: Observer<number> = { next: resolve, complete: resolve };

  const source = hot((observer: Observer<number>) => {
    remoteObserver = {
      next: v => {
        sent.push(v);
        return observer.next(v);
      },
      complete: observer.complete
    };
    return () => {
      remoteObserver = { next: resolve, complete: resolve };
    };
  });

  pipe(
    remoteObserver.next(5),
    then(() => {
      expect(sent).toEqual([5]);
      expect(results).toEqual([]);

      source({
        next: v => {
          results.push(v);
          return timeout(0);
        },
        complete: resolve
      });
    }),
    then2(() => remoteObserver.next(6)),
    then2(() => remoteObserver.next(7)),
    then(() => {
      expect(sent).toEqual([5, 6, 7]);
      expect(results).toEqual([6, 7]);
    })
  );

  await new Promise(r => setTimeout(r, 10));
});
