import { subject } from "./subject";
import { pipe } from "../pipe";
import { Observer } from "./observable";
import { resolve, resolved, then2, commit, timeout } from "../task";

it("subject", async () => {
  const results1: number[] = [];
  const results2: number[] = [];

  let remoteObserver: Observer<number> = { next: resolve, complete: resolve };

  const source = subject((observer: Observer<number>) => {
    remoteObserver = observer;
    return () => {
      remoteObserver = { next: resolve, complete: resolve };
    };
  });

  // gonna be ignored
  remoteObserver.next(4);

  source({
    next: n => {
      results1.push(n);
      return resolved;
    },
    complete: () => {
      results1.push(Number.NEGATIVE_INFINITY);
      return resolved;
    }
  });

  pipe(
    remoteObserver.next(5),
    then2(() => remoteObserver.next(6)),
    commit
  );

  source({
    next: n => {
      results2.push(n);
      return timeout(n);
    },
    complete: () => {
      results2.push(Number.NEGATIVE_INFINITY);
      return timeout(0);
    }
  });

  pipe(
    remoteObserver.next(7),
    then2(() => remoteObserver.next(8)),
    then2(() => remoteObserver.complete()),
    commit
  );

  await new Promise(r => setTimeout(r, 100));

  expect(results1).toEqual([5, 6, 7, 8, Number.NEGATIVE_INFINITY]);

  expect(results2).toEqual([7, 8, Number.NEGATIVE_INFINITY]);
});
