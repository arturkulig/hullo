import { timeout } from "../gen/timeout";

export async function* interval(timeInMs: number) {
  await timeout(timeInMs);
  yield Date.now();
}
