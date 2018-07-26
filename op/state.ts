import { subscribe, Subscription } from "../core/streams/subscribe";
import { observable } from "../core/streams/observable";

export function state<T>(origin: AsyncIterable<T>) {
  let last: { value: T } | null = null;
  return observable<T>(observer => {
    let sub: Subscription | null = null;

    if (last) {
      observer.next(last.value).then(startSub);
    } else {
      startSub();
    }

    return () => {
      if (sub && !sub.closed) {
        sub.unsubscribe();
        sub = null;
      }
    };

    function startSub() {
      if (observer.closed) {
        return;
      }
      sub = subscribe(origin, {
        async next(value: T) {
          last = { value };
          await observer.next(value);
        },
        error: observer.error,
        complete: observer.complete
      });
    }
  });
}
