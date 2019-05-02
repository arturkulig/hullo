import { Duplex } from "./duplex";
import {
  Observer,
  Observable,
  ComplexProducer,
  Cancellation
} from "./observable";

export class Atom<T> extends Duplex<T, T> {
  private context: AtomWideContext<T>;

  constructor(state: T) {
    const context: AtomWideContext<T> = {
      closed: false,
      remote: undefined,
      state: { ref: state }
    };
    const out = new Observable<T>(new AtomProducer<T>(context));
    const ins = new AtomObserver(context);
    super(out, ins);
    this.context = context;
  }

  valueOf(): T {
    return this.context.state.ref;
  }

  unwrap(): T {
    return this.context.state.ref;
  }
}

class AtomProducer<T> implements ComplexProducer<T> {
  constructor(private context: AtomWideContext<T>) {}

  subscribe(observer: Observer<T>) {
    if (this.context.closed) {
      observer.complete();
    } else {
      this.context.remote = observer;
      const { state } = this.context;
      Promise.resolve().then(() => {
        if (this.context.state === state) {
          observer.next(this.context.state.ref);
        }
      });
      return new AtomCancel(this.context);
    }
  }
}

class AtomCancel<T> implements Cancellation {
  constructor(private context: AtomWideContext<T>) {}

  cancel() {
    this.context.remote = undefined;
  }
}

class AtomObserver<T> implements Observer<T> {
  get closed() {
    return this.context.closed;
  }

  constructor(private context: AtomWideContext<T>) {}

  next(ref: T) {
    if (this.closed) {
      return Promise.resolve();
    }
    this.context.state = { ref };
    return this.context.remote
      ? this.context.remote.next(ref)
      : Promise.resolve();
  }

  complete() {
    if (this.closed) {
      return Promise.resolve();
    }
    this.context.closed = true;
    return this.context.remote
      ? this.context.remote.complete()
      : Promise.resolve();
  }
}

interface AtomWideContext<T> {
  closed: boolean;
  remote: Observer<T> | undefined;
  state: { ref: T };
}
