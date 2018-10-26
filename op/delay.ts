import { subscribe, timeout, observable } from "../core";

export function delay(time: number) {
  return <T>(source: AsyncIterable<T>) => {
    return observable<T>(observer => {
      const sub = subscribe(source, {
        next(value) {
          return timeout(time).then(() => observer.next(value));
        }
      });
      return () => {
        if (!sub.closed) {
          sub.unsubscribe();
        }
      };
    });
  };
}
