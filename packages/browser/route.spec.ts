import { ofHistory } from "./ofHistory";
import { route } from "./route";
import { createMemoryHistory } from "history";
import { timeout } from "@hullo/core/timeout";
import { of } from "@hullo/core/of";

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
        route({
          "/test/([0-9]+)": (...args) => of(["test", ...args].join("-")),
          "/[a-z]": () => of("letters"),
          "/[0-9]": () => of("numbers")
        })
      )
      .subscribe({
        next: v => {
          result.push(v);
        }
      });
    await timeout(0);
    expect(result).toEqual([]);

    await history$.next({ pathname: "/d" });
    expect(result).toEqual(["letters"]);

    await history$.next({ pathname: "/0" });
    expect(result).toEqual(["letters", "numbers"]);

    await history$.next({ pathname: "/test/42" });
    expect(result).toEqual(["letters", "numbers", "test-42"]);
  });
});
