import { ofHistory } from "./ofHistory";
import { route } from "./route";
import { createMemoryHistory } from "history";
import { timeout } from "@hullo/core/timeout";

describe("route", () => {
  it("reads", async () => {
    const result: string[] = [];
    const history = createMemoryHistory({
      initialEntries: ["/"],
      initialIndex: 0
    });
    const history$ = ofHistory(history);
    history$
      .pipe(
        route([
          {
            when: /^\/test\/([0-9]+)$/,
            have: (...args) => ["test", ...args].join("-")
          },
          { when: /^\/[a-z]$/, have: () => "letters" },
          { when: /^\/[0-9]$/, have: () => "numbers" },
          { when: /^\/$/, have: () => "index" }
        ])
      )
      .subscribe({
        next: v => {
          result.push(v);
        }
      });
    await timeout(0);
    expect(result).toEqual(["index"]);

    await history$.next({ pathname: "/d" });
    expect(result).toEqual(["index", "letters"]);

    await history$.next({ pathname: "/0" });
    expect(result).toEqual(["index", "letters", "numbers"]);

    await history$.next({ pathname: "/test/42" });
    expect(result).toEqual(["index", "letters", "numbers", "test-42"]);
  });
});
