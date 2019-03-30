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
  const observer = observerForAtom(wide);
  return duplex(o, observer);
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

function observerForAtom<T>(_wide: AtomWideContext<T>): Observer<T> {
  const o: AtomObserver<T> = {
    _wide,
    next,
    complete
  };
  return o;
}

function next<T>(this: AtomObserver<T>, value: T) {
  return this._wide.remote ? this._wide.remote.next(value) : Promise.resolve();
}

function complete<T>(this: AtomObserver<T>) {
  return this._wide.remote ? this._wide.remote.complete() : Promise.resolve();
}

export interface Atom<T> extends Duplex<T, T> {}

interface AtomObserver<T> extends Observer<T> {
  _wide: AtomWideContext<T>;
}

interface AtomWideContext<T> {
  remote: Observer<T> | undefined;
}

interface AtomContext<T> {
  wide: AtomWideContext<T>;
  observer: Observer<T> | undefined;
}
