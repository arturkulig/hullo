import { observable } from "../core/observable";
import { subscribe, Subscription } from "../utils/subscribe";
import { queue } from "../mods/queue";

export function* flatten<T>(subject: Iterable<Iterable<T>>): Iterable<T> {
  for (const items of subject) {
    for (const item of items) {
      yield item;
    }
  }
}

export function flatten$<T>(
  subject: AsyncIterable<AsyncIterable<T>>
): AsyncIterable<T> {
  return observable<T>(
    queue(observer => {
      let innerSubs: Subscription[] = [];
      const outerSub = subscribe(subject, {
        next(inner$) {
          innerSubs.push(
            subscribe<T>(inner$, {
              next(v) {
                return observer.next(v);
              },
              error: observer.error
            })
          );
        },
        error: observer.error,
        complete: observer.complete
      });
      return () => {
        if (!outerSub.closed) {
          outerSub.unsubscribe();
        }
      };
    })
  );
}
