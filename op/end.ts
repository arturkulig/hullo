import { subscribe } from "../utils/subscribe";

export function end<T>(subject: AsyncIterable<T>) {
  return new Promise<void>((resolve, reject) =>
    subscribe(subject, {
      error: reject,
      complete: resolve
    })
  );
}
