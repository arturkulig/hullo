import { observable, Subscription, subscribe } from "../core";
import { buffer } from "./buffer";

export function switchMap<T>(
  subject: AsyncIterable<AsyncIterable<T>>
): AsyncIterable<T> {
  return buffer(
    observable<T>(observer => {
      let innerSub: Subscription | null = null;

      const outerSub = subscribe(subject, {
        next(inner: AsyncIterable<T>) {
          if (innerSub && !innerSub.closed) {
            innerSub.unsubscribe();
          }
          innerSub = subscribe(inner, {
            next(value: T) {
              if (observer.closed) {
                return;
              }
              return observer.next(value);
            },
            error: observer.error
          });
        },
        error: observer.error,
        complete: observer.complete
      });

      return () => {
        if (!outerSub.closed) {
          outerSub.unsubscribe();
        }
        if (innerSub && !innerSub.closed) {
          innerSub.unsubscribe();
        }
      };
    })
  );
}
