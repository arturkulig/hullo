const queue = new Array<[Function, ...any[]]>();

let executing = false;

export function schedule(...args: [Function, ...any[]]) {
  queue.push(args);

  if (!executing) {
    executing = true;
    while (queue.length) {
      const next = queue.shift()!;
      next.shift().apply(undefined, next);
    }
    executing = false;
  }
}
