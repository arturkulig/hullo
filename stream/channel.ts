import { duplex, Duplex } from "./duplex";
import { observable, Observer } from "./observable";
import { all } from "../future/all";
import { then } from "../future/then";
import { future } from "../future/future";
import { Task } from "../future/task";

const looseValue = then<any, void>(() => {});
const combineAndForget = <T>(tasks: (Task<T>)[]) =>
  future(looseValue(all(tasks)));

export interface Channel<T> extends Duplex<T, T> {}

export function channel<T = unknown>() {
  const observers = new Array<Observer<T>>();

  const fanOut = (f: (observer: Observer<T>) => Task) =>
    combineAndForget(observers.map(f));

  return duplex<T, T>(
    {
      next: value => fanOut(observer => observer.next(value)),
      complete: () => fanOut(observer => observer.complete())
    },
    observable(observer => {
      observers.push(observer);

      return () => {
        observers.splice(observers.indexOf(observer), 1);
      };
    })
  );
}
