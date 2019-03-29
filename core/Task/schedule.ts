export type FCV<T, C = any> = {
  v: T;
  fcs?: FC<T, any>[];
} & (Partial<FC<T, C>>);

export interface FC<T, C> {
  f: (this: C, value: T) => void;
  c: C;
}

let running = false;
export let queue: FCV<any, any>[] = [];

export function schedule<T = void, C = void>(
  f: (this: C, arg: T) => any,
  c?: C,
  arg?: T
) {
  const action: FCV<T, C> = {
    f,
    c: c!,
    v: arg!
  };
  queue.push(action);
  if (!running) {
    run();
  }
}

export function run(): void {
  if (running) {
    return;
  }
  running = true;
  for (let i = 0; i < queue.length; i++) {
    const { f, c, v, fcs } = queue[i];
    if (f) {
      f.call(c, v);
    }
    if (fcs) {
      for (let i = 0, l = fcs.length; i < l; i++) {
        fcs![i].f.call(fcs![i].c, v);
      }
    }
  }
  queue = [];
  running = false;
}
