import { map } from "./map";
import { timeout } from "../timeout";
import { observable } from "../observable";

describe("observable", () => {
  it("::map", async () => {
    const result: string[] = [];
    observable<number>(observer => {
      observer.next(2);
      observer.next(3);
    })
      .pipe(map((n: number) => n * 10))
      .pipe(map((n: number) => n.toString()))
      .subscribe({
        next: (n: string) => {
          result.push(n);
        }
      });
    await timeout(0);
    expect(result).toEqual(["20", "30"]);
  });
});
