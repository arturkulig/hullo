export type Reaction<T, ConsumeContext = void> = Partial<
  Interest<T, ConsumeContext>
> & {
  interests?: Interest<T, any>[] | undefined;
};

export type NotDone<T, C = void> = Reaction<T, C> & { done: false };
export type Done<T, C = void> = Reaction<T, C> & { done: true; result: T };

export type Play<T, C = void> = NotDone<T, C> | Done<T, C>;

interface Interest<T, CTX> {
  consume: (this: CTX, value: T) => void;
  consumeContext: CTX;
}

let running = false;
export let queue: Done<any, any>[] = [];

export function schedule<T = void, C = void>(
  f: (this: C, arg: T) => any,
  c?: C,
  arg?: T
) {
  const done: Done<T, C> = {
    done: true,
    consume: f,
    consumeContext: c!,
    result: arg!
  };
  queue.push(done);
  if (!running) {
    run();
  }
}

export function run(): void {
  if (running) {
    return;
  }
  running = true;
  const currentQueue = queue;
  for (let i = 0; i < currentQueue.length; i++) {
    const play = currentQueue[i];
    if (play.consume) {
      play.consume.call(play.consumeContext, play.result!);
    }
    for (
      let i = 0, l = play.interests ? play.interests.length : 0;
      i < l;
      i++
    ) {
      play.interests![i].consume.call(
        play.interests![i].consumeContext,
        play.result
      );
    }
  }
  queue = [];
  running = false;
}
