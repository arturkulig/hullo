import { Duplex } from "./duplex";
import { Observer } from "./observable";
import { state } from "./state";
import { Task, resolved } from "../task";

export interface Atom<T = unknown> extends Duplex<T, T> {
  valueOf(): T;
  update: (updater: (v: T) => T) => Task<any>;
}

export function atom<T = unknown>(init: T): Atom<T> {
  let remoteObserver: null | Observer<T> = null;

  const source = state(init)(state_consumeSource);

  return Object.assign(source, {
    next: atom_next,
    complete: atom_complete,
    update: atom_update
  });

  function state_consumeSource(observer: Observer<T>) {
    remoteObserver = observer;
    observer.next(init);
    return function atom_cancel() {
      remoteObserver = null;
    };
  }

  function atom_next(value: T) {
    return remoteObserver ? remoteObserver.next(value) : resolved;
  }

  function atom_complete() {
    return remoteObserver ? remoteObserver.complete() : resolved;
  }

  function atom_update(reducer: (v: T) => T) {
    return atom_next(reducer(source.valueOf() as T));
  }
}
