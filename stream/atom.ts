import { duplex, Duplex } from "./duplex";
import { observable, Observer } from "./observable";
import { future } from "../future/future";
import { all } from "../future/all";
import { Task } from "../future/task";
import { buffer } from "./buffer";

export interface Atom<T = unknown> extends Duplex<T, T> {}

export function atom<T = unknown>(init: T) {
  const observers = new Array<Observer<T>>();
  let state = init;

  const fanOut = (f: (observer: Observer<T>) => Task | void) =>
    future(consume =>
      all(observers.map(f).filter(<T>(v: T | void): v is T => !!v))(() => {
        consume();
      })
    );

  return duplex<T, T>(
    {
      next: value => {
        state = value;
        return fanOut(observer => observer.next(value));
      },
      complete: () => fanOut(observer => observer.complete())
    },
    buffer(
      observable(observer => {
        observers.push(observer);
        observer.next(state);

        return () => {
          observers.splice(observers.indexOf(observer), 1);
        };
      })
    )
  );
}
