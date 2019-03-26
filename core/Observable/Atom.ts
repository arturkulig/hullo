import { Duplex } from "./Duplex";
import { IObserver, Observable } from "./Observable";
import { Task } from "../Task";
import { State } from "./State";

interface AtomWideContext<T> {
  remote: IObserver<T> | undefined;
}

interface AtomContext<T> {
  wide: AtomWideContext<T>;
  observer: IObserver<T> | undefined;
}

export class Atom<T> extends Duplex<T, T, IObserver<T>> {
  constructor(initial: T) {
    const wide: AtomWideContext<T> = { remote: undefined };
    const observable = new State<T>(
      new Observable<T, AtomContext<T>, AtomWideContext<T>>(
        atomProduce,
        atomContext,
        wide
      ),
      initial
    );
    const observer = new AtomObserver(wide);
    super(observable, observer);
  }

  valueOf(): T {
    const source: unknown = this._observable;
    if (source instanceof State) {
      return (source as State<T>).valueOf();
    }
    throw new Error();
  }
}

function atomContext<T>(arg: AtomWideContext<T>): AtomContext<T> {
  return { wide: arg, observer: undefined };
}

function atomProduce<T>(this: AtomContext<T>, observer: IObserver<T>) {
  this.wide.remote = observer;

  return atomCancel;
}

function atomCancel<T>(this: AtomContext<T>) {
  this.wide.remote = undefined;
}

class AtomObserver<T> implements IObserver<T, AtomObserver<T>> {
  constructor(private _wide: AtomWideContext<T>) {}

  next(value: T) {
    return this._wide.remote ? this._wide.remote.next(value) : Task.resolved;
  }

  complete() {
    return this._wide.remote ? this._wide.remote.complete() : Task.resolved;
  }
}
