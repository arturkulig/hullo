import { timeout } from "../timers/timeout";

export async function* interval(timeInMs: number) {
  await timeout(timeInMs);
  yield Date.now();
}
