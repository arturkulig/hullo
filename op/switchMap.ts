import { observable, Subscription, subscribe, queue } from "../core";

export function switchMap<T>(
  subject: AsyncIterable<AsyncIterable<T>>
): AsyncIterable<T> {
  return observable<T>(
    queue(observer => {
      let innerSub: Subscription | null = null;
      const outerSub = subscribe(subject, {
        async next(inner: AsyncIterable<T>) {
          if (innerSub && !innerSub.closed) {
            innerSub.unsubscribe();
          }
          innerSub = subscribe(inner, {
            async next(value: T) {
              if (observer.closed) {
                return;
              }
              await observer.next(value);
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
