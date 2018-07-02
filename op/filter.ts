import { dualOp } from "../utils/dualOp";

interface Transformer<T, U> {
  (value: T, ordinal: number): U;
}

export function filter<T, U extends boolean | Promise<boolean> = boolean>(
  filter: Transformer<T, U>
) {
  return dualOp<T, Iterable<T>, AsyncIterable<T>>(filterSync, filterAsync);

  function* filterSync(subject: Iterable<T>): Iterable<T> {
    let ordinal = 0;
    for (const item of subject) {
      if (filter(item, ordinal++)) {
        yield item;
      }
    }
  }

  async function* filterAsync(subject: AsyncIterable<T>): AsyncIterable<T> {
    let ordinal = 0;
    for await (const item of subject) {
      if (await filter(item, ordinal++)) {
        yield item;
      }
    }
  }
}
