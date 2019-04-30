import {
  Observable,
  Observer,
  Subscription,
  ComplexProducer,
  Cancellation
} from "../observable";

export function state<T>(initial: T) {
  return function stateI(source: Observable<T>) {
    return new State<T>(initial, source);
  };
}

export class State<T> extends Observable<T> {
  private context: StateContext<T>;

  constructor(value: T, source: Observable<T>) {
    const context: StateContext<T> = {
      last: value,
      source,
      sourceSub: undefined,
      leeches: []
    };
    super(new StateProducer<T>(context));
    this.context = context;
  }

  valueOf(): T {
    return this.context.last;
  }

  unwrap(): T {
    return this.context.last;
  }
}

class StateProducer<T> implements ComplexProducer<T> {
  constructor(private context: StateContext<T>) {}

  subscribe(observer: Observer<T>) {
    const leechContext: StateLeechContext<T> = {
      initialValueScheduled: true,
      observer
    };

    if (this.context.leeches == undefined) {
      this.context.leeches = [];
    }
    this.context.leeches.push(leechContext);

    Promise.resolve({ context: this.context, leechContext }).then(sendInitial);

    this.context.sourceSub =
      this.context.sourceSub ||
      this.context.source.subscribe(new StateSourceObserver(this.context));

    return new StateCancel(leechContext, this.context);
  }
}

function sendInitial<T>({
  context,
  leechContext
}: {
  context: StateContext<T>;
  leechContext: StateLeechContext<T>;
}) {
  if (leechContext.initialValueScheduled) {
    leechContext.initialValueScheduled = false;
    leechContext.observer!.next(context.last);
  }
}

class StateCancel<T> implements Cancellation {
  constructor(
    private leech: StateLeechContext<T>,
    private context: StateContext<T>
  ) {}

  cancel() {
    if (this.context.leeches != undefined) {
      const pos = this.context.leeches.indexOf(this.leech);
      if (pos >= 0) {
        this.context.leeches.splice(pos, 1);
        if (this.context.leeches.length === 0) {
          const { sourceSub } = this.context;
          this.context.sourceSub = undefined;
          if (sourceSub && !sourceSub.closed) {
            sourceSub.cancel();
          }
        }
      }
    }
  }
}

class StateSourceObserver<T> implements Observer<T> {
  get closed() {
    return this.context.leeches.length > 0;
  }

  constructor(private context: StateContext<T>) {}

  next(value: T) {
    this.context.last = value;
    const deliveries: Promise<void>[] = [];
    const { leeches } = this.context;
    if (leeches != undefined) {
      for (let i = 0, l = leeches.length; i < l; i++) {
        leeches[i].initialValueScheduled = false;
        const delivery = leeches[i].observer!.next(value);
        deliveries.push(delivery);
      }
    }
    return deliveries.length ? Promise.all(deliveries) : Promise.resolve();
  }

  complete() {
    const deliveries: Promise<void>[] = [];
    const { leeches } = this.context;
    this.context.leeches = [];
    if (leeches != undefined) {
      for (let i = 0, l = leeches.length; i < l; i++) {
        const delivery = leeches[i].observer!.complete();
        deliveries.push(delivery);
      }
    }
    return deliveries.length ? Promise.all(deliveries) : Promise.resolve();
  }
}

type StateContext<T> = {
  last: T;
  source: Observable<T>;
  sourceSub: Subscription | undefined;
  leeches: StateLeechContext<T>[];
};

interface StateLeechContext<T> {
  observer: Observer<T> | undefined;
  initialValueScheduled: boolean;
}
