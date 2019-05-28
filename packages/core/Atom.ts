import { Duplex } from "./Duplex";
import {
  Observer,
  Observable,
  ComplexProducer,
  Cancellation
} from "./Observable";

export class Atom<T> extends Duplex<T, T> {
  private context: AtomWideContext<T>;

  constructor(state: T) {
    const context: AtomWideContext<T> = {
      closed: false,
      remotes: [],
      state: { ref: state }
    };
    const out = new Observable<T>(new AtomProducer<T>(context));
    const ins = new AtomObserver(context);
    super(out, ins);
    this.context = context;
    this.lastUpdate = Promise.resolve();
  }

  valueOf(): T {
    return this.context.state.ref;
  }

  unwrap(): T {
    return this.context.state.ref;
  }

  private lastUpdate: Promise<any>;
  update(xf: (current: T) => Promise<T> | T) {
    return (this.lastUpdate = this.lastUpdate
      .then(() => xf(this.context.state.ref))
      .then(result => {
        return this.next(result);
      }));
  }
}

class AtomProducer<T> implements ComplexProducer<T> {
  constructor(private context: AtomWideContext<T>) {}

  subscribe(observer: Observer<T>) {
    if (this.context.closed) {
      observer.complete();
    } else {
      this.context.remotes.push(observer);
      const { state } = this.context;
      Promise.resolve().then(() => {
        if (this.context.state === state) {
          observer.next(this.context.state.ref);
        }
      });
      return new AtomCancel(this.context, observer);
    }
  }
}

class AtomCancel<T> implements Cancellation {
  constructor(
    private context: AtomWideContext<T>,
    private observer: Observer<T>
  ) {}

  cancel() {
    this.context.remotes.splice(this.context.remotes.indexOf(this.observer), 1);
  }
}

class AtomObserver<T> implements Observer<T> {
  get closed() {
    return this.context.closed;
  }

  constructor(private context: AtomWideContext<T>) {}

  next(ref: T) {
    if (this.context.closed) {
      return Promise.resolve();
    }
    this.context.state = { ref };
    return this.context.remotes.length
      ? Promise.all(this.context.remotes.map(remote => remote.next(ref)))
      : Promise.resolve();
  }

  complete() {
    if (this.closed) {
      return Promise.resolve();
    }
    this.context.closed = true;
    return this.context.remotes.length
      ? Promise.all(this.context.remotes.map(remote => remote.complete()))
      : Promise.resolve();
  }
}

interface AtomWideContext<T> {
  closed: boolean;
  remotes: Observer<T>[];
  state: { ref: T };
}
