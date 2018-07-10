import { isIterable } from "../utils/isIterable";
import { isAsyncIterable } from "../utils/isAsyncIterable";
import { subscribe, Subscription } from "../utils/subscribe";

export interface IterableConsumer<T> {
  (value: T, ordinal: number): void;
}

export interface AsyncIterableConsumer<T> {
  (value: T, ordinal: number): void | Promise<void>;
}

export function forEach<T>(
  collection: Iterable<T>,
  consumer: IterableConsumer<T>
): void;
export function forEach<T>(
  collection: AsyncIterable<T>,
  actor: AsyncIterableConsumer<T>
): Subscription;
export function forEach<T>(
  collection: AsyncIterable<T> | Iterable<T>,
  actor: AsyncIterableConsumer<T>
) {
  if (isIterable<T>(collection)) {
    let ordinal = 0;
    for (const item of collection) {
      actor(item, ordinal++);
    }
    return;
  } else if (isAsyncIterable(collection)) {
    let ordinal = 0;
    return subscribe<T, Error>(collection, {
      async next(v: T) {
        await actor(v, ordinal++);
      }
    });
  }
  throw new Error("Given argument is neither iterable nor asynciterable");
}
