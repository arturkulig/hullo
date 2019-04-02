import { observable } from "./observable";
import { timeout } from "./timeout";
import { of } from "./of";

describe("observable", () => {
  it("sends one message", async () => {
    let producerCalled = 0;
    const o = observable<number>(observer => {
      producerCalled++;
      observer.next(6);
    });
    let result: number[] = [];
    o.subscribe({
      next: n => {
        result.push(n);
      }
    });

    await timeout(0);

    expect(producerCalled).toBe(1);
    expect(result).toEqual([6]);
  });

  it("sends two messages", async () => {
    const o = observable<number>(observer => {
      observer
        .next(6)
        .then(() => observer.next(7))
        .then(() => observer.complete())
        .then(noop);
      return () => {};
    });
    let result: number[] = [];
    o.subscribe({
      next: n => {
        result.push(n);
      }
    });

    await timeout(0);

    expect(result).toEqual([6, 7]);
  });

  it("sends three messages", async () => {
    const o = observable<number>(observer => {
      observer
        .next(6)
        .then(() => observer.next(7))
        .then(() => observer.next(8))
        .then(() => observer.complete())
        .then(noop);
      return () => {};
    });
    let result: number[] = [];
    o.subscribe({
      next: n => {
        result.push(n);
      }
    });

    await timeout(0);

    expect(result).toEqual([6, 7, 8]);
  });

  it("cancels", async () => {
    const o = observable<number>(observer => {
      observer
        .next(6)
        .then(() => timeout(10))
        .then(() => observer.next(7))
        .then(() => observer.complete())
        .then(noop);
    });
    let result = new Array<number>();
    const sub = o.subscribe({
      next: n => {
        result.push(n);
      }
    });
    sub.cancel();

    await timeout(100);

    expect(result).toEqual([6]);
  });

  it("acknowledged asynchronously", async () => {
    const result: number[] = [];
    of([1, 2, 3, 4]).subscribe({
      next: v => {
        result.push(v);
        return timeout(v * 10);
      }
    });
    await timeout(1000);
    expect(result).toEqual([1, 2, 3, 4]);
  });

  it("observer can be destructured", async () => {
    const result: number[] = [];
    observable<number>(({ next }) => {
      next(5);
    }).subscribe({
      next: v => {
        result.push(v);
      }
    });
    expect(result).toEqual([5]);
  });
});

function noop() {}
