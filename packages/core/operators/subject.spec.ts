import { subject } from "./subject";
import { timeout } from "../timeout";
import { Observable, Observer } from "../Observable";

describe("observable", () => {
  it("subject", async () => {
    let sourceProducerCalled = 0;
    const results1: number[] = [];
    const results2: number[] = [];

    let remoteObserver: Observer<number> = {
      closed: false,
      next: () => Promise.resolve(),
      complete: () => Promise.resolve()
    };

    const source = new Observable<number>(observer => {
      sourceProducerCalled++;
      remoteObserver = observer;
      return () => {
        remoteObserver = {
          closed: false,
          next: () => Promise.resolve(),
          complete: () => Promise.resolve()
        };
      };
    }).pipe(subject);

    // gonna be ignored
    remoteObserver.next(4);

    source.subscribe({
      next: n => {
        results1.push(n);
      },
      complete: () => {
        results1.push(Number.NEGATIVE_INFINITY);
      }
    });

    remoteObserver.next(5).then(() => remoteObserver.next(6));

    await new Promise(r => setTimeout(r, 1000));

    source.subscribe({
      next: n => {
        results2.push(n);
        return timeout(n);
      },
      complete: () => {
        results2.push(Number.NEGATIVE_INFINITY);
        return timeout(0);
      }
    });

    (async () => {
      await remoteObserver.next(7);
      await remoteObserver.next(8);
      await remoteObserver.complete();
    })();

    await new Promise(r => setTimeout(r, 1000));

    expect(sourceProducerCalled).toBe(1);
    expect(results1).toEqual([5, 6, 7, 8, Number.NEGATIVE_INFINITY]);
    expect(results2).toEqual([7, 8, Number.NEGATIVE_INFINITY]);
  });
});
