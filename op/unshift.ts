import { state } from "./state";
import { observable, subscribe, Subscription } from "../core";

export function unshift<T>(initialValue: T) {
  return function* unshiftWithInitial(source: Iterable<T>) {
    yield initialValue;
    yield* source;
  };
}

export function unshift$<T>(initialValue: T) {
  return function unshift$WithInitial(source: AsyncIterable<T>) {
    return state(
      observable(observer => {
        let sub: Subscription | null = null;
        observer
          .next(initialValue)
          .catch(() => {})
          .then(() => {
            if (!observer.closed) {
              sub = subscribe(source, observer);
            }
          });
        return () => {
          if (sub && !sub.closed) {
            sub.unsubscribe();
          }
        };
      })
    );
  };
}
