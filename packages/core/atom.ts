import { Duplex, duplex } from "./duplex";
import { Observer, observable } from "./observable";
import { state } from "./operators/state";

export function atom<T>(initial: T): Atom<T> {
  const wide: AtomWideContext<T> = { remote: undefined };
  const o = observable<T, AtomContext<T>, AtomWideContext<T>>(
    atomProduce,
    atomContext,
    wide
  ).pipe(state(initial));
  return Object.assign(
    duplex<T, AtomWideContext<T>, T>(o, { next, complete }, wide),
    {
      valueOf(): T {
        return o.valueOf() as T;
      },
      unwrap(): T {
        return o.unwrap();
      }
    }
  );
}

function atomContext<T>(arg: AtomWideContext<T>): AtomContext<T> {
  return { wide: arg, observer: undefined };
}

function atomProduce<T>(this: AtomContext<T>, observer: Observer<T>) {
  this.wide.remote = observer;

  return atomCancel;
}

function atomCancel<T>(this: AtomContext<T>) {
  this.wide.remote = undefined;
}

function next<T>(this: AtomWideContext<T>, value: T) {
  return this.remote ? this.remote.next(value) : Promise.resolve();
}

function complete<T>(this: AtomWideContext<T>) {
  return this.remote ? this.remote.complete() : Promise.resolve();
}

export interface Atom<T> extends Duplex<T, T> {
  valueOf(): T;
  unwrap(): T;
}

interface AtomWideContext<T> {
  remote: Observer<T> | undefined;
}

interface AtomContext<T> {
  wide: AtomWideContext<T>;
  observer: Observer<T> | undefined;
}
