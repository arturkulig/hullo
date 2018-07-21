import { AsyncObserver } from "../streams";
import { queue } from "../mods";
import { observable } from "../streams";

export interface Atom<T, ERR> extends AsyncIterable<T>, AsyncObserver<T, ERR> {
  valueOf(): T;
}

export function atom<T, ERR = Error>(initial: T): Atom<T, ERR> {
  let state: T = initial;
  const observers: Array<AsyncObserver<T, ERR>> = [];

  return {
    valueOf() {
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
