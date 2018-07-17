import { subscribe } from "../utils/subscribe";

export function first<T>(subject: Iterable<T>) {
  for (const item of subject) {
    return item;
  }
}

export function first$<T>(subject: AsyncIterable<T>) {
  return new Promise<T>((resolve, reject) => {
    let resolved = false;
    const sub = subscribe(subject, {
      next(item) {
        resolve(item);
        resolved = true;
        if (sub) {
          sub.unsubscribe();
        }
      },
      error: reject
    });
    if (resolved) {
      sub.unsubscribe();
    }
  });
}
