import { AsyncObserver } from "./observableTypes";
import { observable } from "./observable";
import { duplex, Duplex } from "./duplex";

export interface Channel<T> extends Duplex<T, T> {}

export function channel<T>(): Channel<T> {
  const observers: Array<AsyncObserver<T>> = [];

  return duplex(
    {
      get closed() {
        return observers.reduce((r: boolean, i) => r && i.closed, true);
      },
      next(value: T) {
        return Promise.all(
          observers.map(observer => observer.next(value))
        ).then(noop);
      },
      error(error) {
        return Promise.all(
          observers.map(observer => observer.error(error))
        ).then(noop);
      },
      complete() {
        return Promise.all(observers.map(observer => observer.complete())).then(
          noop
        );
      }
    },
    observable<T>(observer => {
      observers.push(observer);
      return () => {
        observers.splice(observers.indexOf(observer), 1);
      };
    })
  );
}

function noop() {}
