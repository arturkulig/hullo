import { Duplex } from "./duplex";
import {
  Observer,
  Observable,
  ComplexProducer,
  Cancellation
} from "./observable";
import { state, State } from "./operators/state";

export class Atom<T> extends Duplex<T, T> {
  private state: State<T>;

  constructor(init: T) {
    const context: AtomWideContext<T> = {
      closed: false,
      remote: undefined
    };
    const out = new Observable<T>(new AtomProducer<T>(context)).pipe(
      state(init)
    );
    const ins = new AtomObserver(context);
    super(out, ins);
    this.state = out;
  }

  valueOf(): T {
    return this.state.valueOf();
  }

  unwrap(): T {
    return this.state.unwrap();
  }
}

class AtomProducer<T> implements ComplexProducer<T> {
  constructor(private context: AtomWideContext<T>) {}

  subscribe(observer: Observer<T>) {
    if (this.context.closed) {
      observer.complete();
    } else {
      this.context.remote = observer;
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

  next(value: T) {
    if (this.closed) {
      return Promise.resolve();
    }
    return this.context.remote
      ? this.context.remote.next(value)
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
}
