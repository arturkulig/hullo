const queue = new Array<IArguments>();

let executing = false;

export function schedule(...args: [Function, ...any[]]): void;
export function schedule(): void {
  queue.push(arguments);

  if (!executing) {
    executing = true;
    while (queue.length) {
      const next = queue.shift()!;
      const f: (...args: any[]) => any = next[0];
      if (next.length === 0) {
        f();
      } else {
        const args = Array.prototype.slice.call(next, 1);
        f.apply(null, args);
      }
    }
    executing = false;
  }
}
