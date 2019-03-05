import { Duplex } from "./duplex";
import { observable, Observer } from "./observable";
import { buffer } from "./buffer";
import { subject } from "./subject";
import { resolved, Task } from "../future";
import { pipe } from "../pipe";

type NotFunction<T> = T extends (...args: any[]) => any ? never : T;

export interface Atom<T = unknown>
  extends Duplex<NotFunction<T>, NotFunction<T>> {
  update: (valueOrReducer: (v: T) => T) => Task<any>;
  valueOf(): T;
}

export function atom<T = unknown>(init: T): Atom<T> {
  let remoteObserver: null | Observer<T> = null;
  let state = init;

  return Object.assign(
    {
      next: function atomNext(value: T) {
        state = value;
        return remoteObserver ? remoteObserver.next(value) : resolved;
      },
      update: function atomUpdate(reducer: (v: T) => T) {
        const value = reducer(state);
        state = value;
        return remoteObserver ? remoteObserver.next(value) : resolved;
      },
      complete: function atomCompletion() {
        return remoteObserver ? remoteObserver.complete() : resolved;
      },
      valueOf: function atomValueOf() {
        return state;
      },
      toString: function atomToString() {
        return state && state.toString ? state.toString() : "[Object Atom]";
      },
      [typeof Symbol ? Symbol.toStringTag : ""]: "[Object Atom]"
    },
    pipe(
      observable(function watchAtomValues(observer) {
        remoteObserver = observer;
        observer.next(state);

        return () => {
          remoteObserver = null;
        };
      }),
      buffer,
      subject
    )
  );
}
