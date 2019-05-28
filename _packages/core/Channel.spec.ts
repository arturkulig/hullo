import { Channel } from "./Channel";
import { timeout } from "./timeout";

describe("channel", () => {
  it("passes messages", async () => {
    const result: (number | null)[] = [];
    const ch = new Channel<number>();

    ch.subscribe({
      next(v) {
        result.push(v);
      },
      complete() {
        result.push(null);
      }
    });
    await ch.next(3);
    await ch.next(4);
    await ch.complete();
    await ch.next(5);

    await timeout(0);
    expect(result).toEqual([3, 4, null]);
  });

  it("closes", async () => {
    const result: (number | null)[] = [];
    const ch = new Channel<number>();
    const sink = {
      next(v: number) {
        result.push(v);
      },
      complete() {
        result.push(null);
      }
    };

    ch.subscribe(sink);
    await ch.next(3);
    await ch.next(4);
    await ch.complete();

    ch.subscribe(sink);
    await ch.next(5);

    await timeout(0);
    expect(result).toEqual([3, 4, null, null]);
  });

  it("releases one unsafely", async () => {
    const result: (number | null)[] = [];
    const ch = new Channel<number>();

    await Promise.all([
      (async () => {
        try {
          while (true) {
            result.push(await ch.take());
            await timeout(0);
          }
        } catch {
          result.push(null);
        }
      })(),
      (async () => {
        await ch.next(3);
        await ch.next(4);
        await ch.complete();
        await ch.next(5);
      })()
    ]);

    await timeout(0);
    expect(result).toEqual([3, 4, null]);
  });

  it("releases one safely", async () => {
    const result: (number | null)[] = [];
    const ch = new Channel<number>();

    await Promise.all([
      (async () => {
        while (true) {
          const next = await ch.tryTake();
          if (next.closed === true) {
            result.push(null);
            return;
          }
          result.push(next.value);
          await timeout(0);
        }
      })(),
      (async () => {
        await ch.next(3);
        await ch.next(4);
        await ch.complete();
        await ch.next(5);
      })()
    ]);

    await timeout(0);
    expect(result).toEqual([3, 4, null]);
  });
});
