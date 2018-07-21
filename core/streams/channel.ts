import { AsyncObserver } from "../streams";
import { queue } from "../mods";
import { observable } from "../streams";

export function channel<T, ERR = Error>(): AsyncIterable<T> &
  AsyncObserver<T, ERR> {
  const observers: Array<AsyncObserver<T, ERR>> = [];

  return {
    [Symbol.asyncIterator]() {
      return observable<T, ERR>(
        queue(observer => {
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
