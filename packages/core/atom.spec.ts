import { Atom } from "./atom";
import { timeout } from "./timeout";

describe("Atom", () => {
  it("passes messages", async () => {
    const result: number[] = [];
    const a = new Atom(0);
    a.subscribe({
      next: n => {
        result.push(n);
      }
    });

    await timeout(0);
    await a.next(1);
    await a.next(2);

    expect(result).toEqual([0, 1, 2]);
  });

  it("allows changin state even if not subscribed", async () => {
    const a = new Atom(0);
    await timeout(0);
    await a.next(1);
    expect(a.unwrap()).toEqual(1);
  });
});
