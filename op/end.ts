import { subscribe } from "../core";

export function end<T>(subject: AsyncIterable<T>) {
  return new Promise<void>((resolve, reject) =>
    subscribe(subject, {
      error: reject,
      complete: resolve
    })
  );
}
