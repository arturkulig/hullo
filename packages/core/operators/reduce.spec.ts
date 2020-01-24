import { of } from "../of";
import { reduce } from "./reduce";
import { timeout } from "../timeout";

it("reduce", async () => {
  const result: string[] = [];
  of([4, 7, 13])
    .pipe(reduce((r, i) => r + i.toString(), ""))
    .subscribe({
      next: v => {
        result.push(v);
      }
    });
  await timeout(0);
  expect(result).toEqual(["4713"]);
});
