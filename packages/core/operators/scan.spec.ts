import { of } from "../of";
import { scan } from "./scan";
import { timeout } from "../timeout";

it("scan", async () => {
  const result: string[] = [];
  of([4, 7, 13])
    .pipe(scan((r, i) => r + i.toString(), ""))
    .subscribe({
      next: v => {
        result.push(v);
      }
    });
  await timeout(0);
  expect(result).toEqual(["4", "47", "4713"]);
});
