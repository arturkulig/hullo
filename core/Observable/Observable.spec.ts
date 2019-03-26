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
      const exe = observer
        .next(6)
        .bind(() => observer.next(7))
        .bind(() => observer.complete())
        .run(noop);
      return () => {
        exe.cancel();
      };
    });
    let result: number[] = [];
    o.subscribe({
      next: n => {
        result.push(n);
      }
    });
    expect(result).toEqual([6, 7]);
  });

  it("cancels", async () => {
    const o = new Observable<number>(observer => {
      const exe = observer
        .next(6)
        .bind(() => new Timeout(10))
        .bind(() => observer.next(7))
        .bind(() => observer.complete())
        .run(noop);
      return () => {
        exe.cancel();
      };
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
});

function noop() {}
