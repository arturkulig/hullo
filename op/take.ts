import { isIterable } from "../utils/isIterable";
import { isAsyncIterable } from "../utils/isAsyncIterable";

export function take(amount: number) {
  return takeFrom;

  function takeFrom<T>(subject: Iterable<T>): Iterable<T>;
  function takeFrom<T>(subject: AsyncIterable<T>): Promise<Iterable<T>>;
  function takeFrom<T>(
    subject: Iterable<T> | AsyncIterable<T>
  ): Iterable<T> | Promise<Iterable<T>> {
    if (isIterable(subject)) {
      return takeSync(subject);
    } else if (isAsyncIterable(subject)) {
      return takeAsync(subject);
    }
    throw new Error("Subject is neither Iterable nor AsyncIterable");
  }

  function* takeSync<T>(subject: Iterable<T>) {
    let currentLength = 0;
    for (const item of subject) {
      if (currentLength >= amount) {
        return;
      }
      currentLength++;
      yield item;
      if (currentLength >= amount) {
        return;
      }
    }
  }

  async function takeAsync<T>(subject: AsyncIterable<T>) {
    const result = new Array<T>();
    if (result.length >= amount) {
      return result;
    }
    for await (const item of subject) {
      result.push(item);
      if (result.length >= amount) {
        break;
      }
    }
    return result;
  }
}
