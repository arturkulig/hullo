import { isIterable } from "../utils/isIterable";
import { isAsyncIterable } from "../utils/isAsyncIterable";

export function first<T>(subject: Iterable<T>): T | undefined;
export function first<T>(subject: AsyncIterable<T>): Promise<T | undefined>;
export function first<T>(subject: Iterable<T> | AsyncIterable<T>) {
  if (isIterable(subject)) {
    return firstSync(subject);
  } else if (isAsyncIterable(subject)) {
    return firstAsync(subject);
  }
  throw new Error("Subject is neither Iterable nor AsyncIterable");
}

function firstSync<T>(subject: Iterable<T>) {
  for (const item of subject) {
    return item;
  }
}

async function firstAsync<T>(subject: AsyncIterable<T>) {
  for await (const item of subject) {
    return item;
  }
}
