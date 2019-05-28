import { Atom } from "./Atom";
import { timeout } from "./timeout";

describe("Atom", () => {
  it("passes messages", async () => {
    const result: number[] = [];
    const result2: number[] = [];
    const a = new Atom(0);
    a.subscribe({
      next: n => {
        result.push(n);
      }
    });
    a.subscribe({
      next: n => {
        result2.push(n);
      }
    });

    await timeout(0);
    await a.next(1);
    await a.next(2);

    expect(result).toEqual([0, 1, 2]);
    expect(result2).toEqual([0, 1, 2]);
  });

  it("allows changin state even if not subscribed", async () => {
    const a = new Atom(0);
    await timeout(0);
    await a.next(1);
    expect(a.unwrap()).toEqual(1);
  });

  it("queues long updates correctly", async () => {
    const result: number[] = [];
    const a = new Atom(0);
    a.subscribe({
      next: n => {
        result.push(n);
      }
    });
    await Promise.all([
      a.update(i => i + 1),
      a.update(async i => {
        await timeout(100);
        return i + 10;
      }),
      a.update(async i => {
        await timeout(0);
        return i + 100;
      })
    ]);
    expect(result).toEqual([0, 1, 11, 111]);
  });
});
