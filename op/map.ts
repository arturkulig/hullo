import { dualOp } from "../utils/dualOp";

interface Transformer<T, U> {
  (value: T, ordinal: number): U;
}

export function map<T, U>(transformer: Transformer<T, U>) {
  type SYNC_OPT = Iterable<U>;
  type ASYNC_OPT = AsyncIterable<U extends Promise<infer X> ? X : U>;
  return dualOp<T, SYNC_OPT, ASYNC_OPT>(mapSync, mapAsync);

  function* mapSync(subject: Iterable<T>): SYNC_OPT {
    let ordinal = 0;
    for (const item of subject) {
      yield transformer(item, ordinal++);
    }
  }

  async function* mapAsync(subject: AsyncIterable<T>): ASYNC_OPT {
    let ordinal = 0;
    for await (const item of subject) {
      yield (await transformer(item, ordinal++)) as any;
    }
  }
}
