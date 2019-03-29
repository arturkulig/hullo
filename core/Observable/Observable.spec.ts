import { Observable } from "./Observable";
import { Timeout } from "../Task";

describe("observable", () => {
  it("sends one message", () => {
    let producerCalled = 0;
    const o = new Observable<number>(observer => {
      producerCalled++;
      observer.next(6);
    });
    let result: number[] = [];
    o.subscribe({
      next: n => {
        result.push(n);
      }
    });
    expect(producerCalled).toBe(1);
    expect(result).toEqual([6]);
  });

  it("sends two messages", () => {
    const o = new Observable<number>(observer => {
      observer
        .next(6)
        .bind(() => observer.next(7))
        .bind(() => observer.complete())
        .run(noop);
      return () => {};
    });
    let result: number[] = [];
    o.subscribe({
      next: n => {
        result.push(n);
      }
    });
    expect(result).toEqual([6, 7]);
  });

  it("sends three messages", () => {
    const o = new Observable<number>(observer => {
      observer
        .next(6)
        .bind(() => observer.next(7))
        .bind(() => observer.next(8))
        .bind(() => observer.complete())
        .run(noop);
      return () => {};
    });
    let result: number[] = [];
    o.subscribe({
      next: n => {
        result.push(n);
      }
    });
    expect(result).toEqual([6, 7, 8]);
  });

  it("cancels", async () => {
    const o = new Observable<number>(observer => {
      observer
        .next(6)
        .bind(() => new Timeout(10))
        .bind(() => observer.next(7))
        .bind(() => observer.complete())
        .run(noop);
    });
    let result = new Array<number>();
    const sub = o.subscribe({
      next: n => {
        result.push(n);
      }
    });
    sub.cancel();
    await new Promise(r => setTimeout(r, 100));
    expect(result).toEqual([6]);
    await new Promise(r => setTimeout(r));
  });

  describe("of", () => {
    it("unit", () => {
      const result: number[] = [];
      Observable.of(1).subscribe({
        next: v => {
          result.push(v);
        }
      });
      expect(result).toEqual([1]);
    });

    it("iterable", () => {
      const result: number[] = [];
      Observable.of([1, 2, 3]).subscribe({
        next: v => {
          result.push(v);
        }
      });
      expect(result).toEqual([1, 2, 3]);
    });
  });

  it("acknowledged asynchronously", async () => {
    debugger;
    const result: number[] = [];
    Observable.of([1, 2, 3, 4]).subscribe({
      next: v => {
        result.push(v);
        return new Timeout(v * 10);
      }
    });
    await new Promise(r => setTimeout(r, 1000));
    expect(result).toEqual([1, 2, 3, 4]);
  });
});

function noop() {}
