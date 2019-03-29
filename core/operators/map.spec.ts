import { Observable } from "../Observable";
import { map } from "./map";

describe("Observable", () => {
  it("::map", () => {
    const result: string[] = [];
    new Observable<number>(observer => {
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
    expect(result).toEqual(["20", "30"]);
  });
});
