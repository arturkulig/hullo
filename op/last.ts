import { subscribe } from "../core";

export function last<T>(subject: Iterable<T>) {
  let result: T | undefined;
  for (const item of subject) {
    result = item;
  }
  return result;
}

export function last$<T>(subject: AsyncIterable<T>) {
  return new Promise<T>((resolve, reject) => {
    let result: { value: T } | null = null;
    subscribe(subject, {
      next(value) {
        result = { value };
      },
      error: reject,
      complete() {
        if (result) {
          resolve(result.value);
        } else {
          reject();
        }
      }
    });
  });
}
