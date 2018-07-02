export function timeout(timeInMs: number) {
  return new Promise(r => setTimeout(r, timeInMs));
}
