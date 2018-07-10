import { Transformer } from "./map";

export function filter<T>(filter: Transformer<T, boolean>) {
  return function* _filter(subject: Iterable<T>): Iterable<T> {
    let ordinal = 0;
    for (const item of subject) {
      if (filter(item, ordinal++)) {
        yield item;
      }
    }
  };
}

export function filter$<T, U extends boolean | Promise<boolean> = boolean>(
  filter: Transformer<T, Promise<U> | U>
) {
  return async function* filterAsync(
    subject: AsyncIterable<T>
  ): AsyncIterable<T> {
    let ordinal = 0;
    for await (const item of subject) {
      if (await filter(item, ordinal++)) {
        yield item;
      }
    }
  };
}
