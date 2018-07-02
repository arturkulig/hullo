import { AsyncObserver } from "../observable/observableTypes";
import { queue } from "../observable/queue";
import { observable } from "../observable/observable";

export function atom<T, ERR = Error>(
  initial: T
): AsyncIterable<T> & AsyncObserver<T, ERR> & { readonly state: T } {
  let state: T = initial;
  const observers: Array<AsyncObserver<T, ERR>> = [];

  return {
    get state() {
      return state;
    },
    [Symbol.asyncIterator]() {
      return observable<T, ERR>(
        queue(observer => {
          observer.next(state);
          observers.push(observer);
          return () => {
            observers.splice(observers.indexOf(observer), 1);
          };
        })
      )[Symbol.asyncIterator]();
    },
    get closed() {
      return observers.reduce((r: boolean, i) => r && i.closed, true);
    },
    async next(value: T) {
      state = value;
      await Promise.all(observers.map(observer => observer.next(value)));
    },
    async error(error: ERR) {
      await Promise.all(observers.map(observer => observer.error(error)));
    },
    async complete() {
      await Promise.all(observers.map(observer => observer.complete()));
    }
  };
}
