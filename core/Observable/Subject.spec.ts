import { Task, Timeout } from "../Task";
import { IObserver, Observable } from "./Observable";
import { Subject } from "./Subject";

it("Subject", async () => {
  let sourceProducerCalled = 0;
  const results1: number[] = [];
  const results2: number[] = [];

  let remoteObserver: IObserver<number> = {
    next: Task.resolve,
    complete: Task.resolve
  };

  const subject = new Subject(
    new Observable<number>(observer => {
      sourceProducerCalled++;
      remoteObserver = observer;
      return () => {
        remoteObserver = { next: Task.resolve, complete: Task.resolve };
      };
    })
  );

  // gonna be ignored
  remoteObserver.next(4);

  subject.subscribe({
    next: n => {
      results1.push(n);
    },
    complete: () => {
      results1.push(Number.NEGATIVE_INFINITY);
    }
  });

  remoteObserver.next(5).run(() => remoteObserver.next(6));

  subject.subscribe({
    next: n => {
      results2.push(n);
      return new Timeout(n);
    },
    complete: () => {
      results2.push(Number.NEGATIVE_INFINITY);
      return new Timeout(0);
    }
  });

  remoteObserver
    .next(7)
    .bind(() => remoteObserver.next(8))
    .run(() => remoteObserver.complete());

  await new Promise(r => setTimeout(r, 1000));

  expect(sourceProducerCalled).toBe(1);
  expect(results1).toEqual([5, 6, 7, 8, Number.NEGATIVE_INFINITY]);
  expect(results2).toEqual([7, 8, Number.NEGATIVE_INFINITY]);
});
