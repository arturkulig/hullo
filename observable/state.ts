import { subscribe } from "../observable/subscribe";
import { observable } from "../observable/observable";
import { queue } from "./queue";

export function state<T, ERR = Error>(origin: AsyncIterable<T>) {
  let last: { value: T } | null = null;
  return observable<T, ERR>(
    queue(observer => {
      if (last) {
        observer.next(last.value);
      }
      const sub = subscribe(origin, {
        async next(value: T) {
          last = { value };
          await observer.next(value);
        },
        error: observer.error,
        complete: observer.complete
      });
      return sub.unsubscribe;
    })
  );
}
