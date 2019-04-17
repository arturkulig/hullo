import { mapAsync } from "./mapAsync";
import { timeout } from "../timeout";
import { observable } from "../observable";

describe("observable", () => {
  it("::mapAsync", async () => {
    const result: string[] = [];
    observable<number>(observer => {
      observer.next(2);
      observer.next(3);
    })
      .pipe(mapAsync(async (n: number) => n * 10))
      .pipe(mapAsync(async (n: number) => n.toString()))
      .subscribe({
        next: (n: string) => {
          result.push(n);
        }
      });
    await timeout(0);
    expect(result).toEqual(["20", "30"]);
  });
});
