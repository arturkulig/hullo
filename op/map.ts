export interface Transformer<T, U> {
  (value: T, ordinal: number): U;
}

export function map<T, U>(transformer: Transformer<T, U>) {
  return function* _map(subject: Iterable<T>) {
    let ordinal = 0;
    for (const item of subject) {
      yield transformer(item, ordinal++);
    }
  };
}

export function map$<T, U>(transformer: Transformer<T, Promise<U> | U>) {
  return async function* async(subject: AsyncIterable<T>) {
    let ordinal = 0;
    for await (const item of subject) {
      yield await transformer(item, ordinal++);
    }
  };
}
