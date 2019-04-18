import { ofHistory } from "./ofHistory";
import { createMemoryHistory, MemoryHistory } from "history";
import { timeout } from "@hullo/core/timeout";

describe("ofHistory", () => {
  it("reads", async () => {
    const result: string[] = [];
    const history = createMemoryHistory({
      initialEntries: ["/"],
      initialIndex: 0
    });
    ofHistory(history).subscribe({
      next: location => {
        result.push(location.pathname);
      }
    });
    await timeout(0);
    expect(result).toEqual(["/"]);
  });

  it("writes", async () => {
    const result: { state: number | null; url: string; search: string }[] = [];
    const history: MemoryHistory<number | null> = createMemoryHistory({
      initialEntries: ["/"],
      initialIndex: 0
    });
    const location$ = ofHistory<number | null>(history);
    location$.subscribe({
      next: location => {
        result.push({
          state: location.state,
          url: location.pathname,
          search: location.search
        });
      }
    });
    await timeout(0);
    await location$.next({ pathname: "/d" });
    await timeout(0);
    await location$.next({ search: "q=1", state: 2 });
    await timeout(0);
    await location$.next({ search: "y=1" });
    await timeout(0);
    expect(result).toEqual([
      { state: undefined, url: "/", search: "" },
      { state: undefined, url: "/d", search: "" },
      { state: 2, url: "/d", search: "?q=1" },
      { state: undefined, url: "/d", search: "?y=1" }
    ]);
    expect(history.location.pathname).toEqual("/d");
    expect(history.location.search).toEqual("?y=1");
  });
});
