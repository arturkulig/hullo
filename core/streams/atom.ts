import { AsyncObserver } from "./observableTypes";
import { observable } from "./observable";
import { duplex, Duplex } from "./duplex";

export interface Atom<T> extends Duplex<T, T> {
  valueOf(): T;
}

export function atom<T>(initial: T): Atom<T> {
  const observers: Array<AsyncObserver<T>> = [];
  let state: T = initial;

  return Object.assign(
    duplex(
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
          return Promise.all(
            observers.map(observer => observer.complete())
          ).then(noop);
        }
      },
      observable<T>(observer => {
        observer.next(state).then(() => {
          if (!observer.closed) {
            observers.push(observer);
          }
        });
        return () => {
          if (observers.indexOf(observer) >= 0) {
            observers.splice(observers.indexOf(observer), 1);
          }
        };
      })
    ),
    {
      valueOf() {
        return state;
      }
    }
  );
}

function noop() {}
