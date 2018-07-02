import { isIterable } from "../utils/isIterable";
import { isAsyncIterable } from "../utils/isAsyncIterable";

export function last<T>(subject: Iterable<T>): T | undefined;
export function last<T>(subject: AsyncIterable<T>): Promise<T | undefined>;
export function last<T>(subject: Iterable<T> | AsyncIterable<T>) {
  if (isIterable(subject)) {
    return lastSync(subject);
  } else if (isAsyncIterable(subject)) {
    return lastAsync(subject);
  }
  throw new Error("Subject is neither Iterable nor AsyncIterable");
}

function lastSync<T>(subject: Iterable<T>) {
  let result: T | undefined;
  for (const item of subject) {
    result = item;
  }
  return result;
}

async function lastAsync<T>(subject: AsyncIterable<T>) {
  let result: T | undefined;
  for await (const item of subject) {
    result = item;
  }
  return result;
}
