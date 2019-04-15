import { history } from "./history";
import { timeout } from "@hullo/core/timeout";

(global as any).window = {
  addEventListener() {},
  dispatchEvent() {
    return false;
  },
  removeEventListener() {}
};

describe("ofLocation", () => {
  it("reads", async () => {
    const result: string[] = [];
    (global as any).window.location = { href: "http://localhost/" };
    (global as any).window.history = {
      state: null,
      pushState(state: null, _title: string, href: string) {
        (global as any).window.history.state = state;
        (global as any).window.location.href = new URL(
          href,
          (global as any).window.location.href
        ).href;
      }
    };
    history().subscribe({
      next: v => {
        result.push(v.url.href);
      }
    });
    await timeout(0);
    expect(result).toEqual(["http://localhost/"]);
  });

  it("writes", async () => {
    const result: { state: number | null; url: string }[] = [];
    (global as any).window.location = { href: "http://localhost/" };
    (global as any).window.history = {
      state: null as (number | null),
      pushState(state: number | null, _title: string, href?: string) {
        (global as any).window.history.state = state;
        if (href) {
          (global as any).window.location.href = new URL(
            href,
            (global as any).window.location.href
          ).href;
        }
      }
    };
    const location$ = history<number | null>();
    location$.subscribe({
      next: v => {
        result.push({ state: v.state, url: v.url.href });
      }
    });
    await timeout(0);
    await location$.next("/d");
    await timeout(0);
    await location$.next({ url: "?q=1", state: 2 });
    await timeout(0);
    expect(result).toEqual([
      { state: null, url: "http://localhost/" },
      { state: null, url: "http://localhost/d" },
      { state: 2, url: "http://localhost/d?q=1" }
    ]);
    expect((global as any).window.location).toEqual({
      href: "http://localhost/d?q=1"
    });
  });
});
