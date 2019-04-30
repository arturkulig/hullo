export const observableSymbol = Symbol("is observable");

export class Observable<T> {
  [observableSymbol] = true;

  static isObservable<T>(o: any): o is Observable<T> {
    return o != null && typeof o === "object" && o[observableSymbol];
  }

  constructor(private produce: Producer<T>) {}

  subscribe(observer: Subscriber<T>): Subscription {
    const observation: Observation<T> = {
      stage: Stage.active,
      subscriber: observer
    };

    const sub = new BaseSubscription(observation);

    const teardown =
      typeof this.produce === "function"
        ? this.produce(new BaseObserver(observation))
        : this.produce.subscribe(new BaseObserver(observation));

    if (isTeardown(teardown)) {
      observation.teardown = teardown;
    }

    return sub;
  }

  pipe<U>(transducer: (it: Observable<T>) => U): U {
    return transducer(this);
  }
}

class BaseSubscription<T> implements Subscription {
  constructor(private observation: Observation<T>) {}

  get closed() {
    const { stage } = this.observation;
    return stage === Stage.cancelled || stage === Stage.completed;
  }

  cancel() {
    this.observation.stage = Stage.cancelled;
    const { teardown, sending } = this.observation;
    if (teardown) {
      (sending || Promise.resolve()).then(() => {
        doTeardown(teardown);
      });
    }
  }
}

class BaseObserver<T> implements Observer<T> {
  constructor(private observation: Observation<T>) {}

  get closed() {
    return this.observation.stage !== Stage.active;
  }

  next(value: T): Promise<any> {
    const { stage, subscriber, sending } = this.observation;

    if (stage !== Stage.active || !subscriber.next) {
      return Promise.resolve();
    }

    if (sending) {
      return sending.then(() => {
        this.observation.sending = undefined;
        return this.next(value);
      });
    }

    const nextSending = subscriber.next(value) || undefined;

    this.observation.sending = nextSending;

    return nextSending || Promise.resolve();
  }

  complete(): Promise<any> {
    const { stage, subscriber, sending } = this.observation;

    if (stage !== Stage.active || !subscriber.complete) {
      return Promise.resolve();
    }

    if (sending) {
      return sending.then(() => {
        this.observation.sending = undefined;
        return this.complete();
      });
    }

    this.observation.stage = Stage.completed;

    const nextSending = subscriber.complete() || undefined;

    this.observation.sending = nextSending;

    return nextSending || Promise.resolve();
  }
}

enum Stage {
  active,
  completed,
  cancelled
}

interface Observation<T> {
  stage: Stage;
  sending?: Promise<any>;

  teardown?: Teardown;

  subscriber: Subscriber<T>;
}

export interface Subscription {
  readonly closed: boolean;
  cancel(): void;
}
export interface Observer<T> {
  readonly closed: boolean;
  next(value: T): Promise<any>;
  complete(): Promise<any>;
}

export interface Subscriber<T> {
  next?: (value: T) => void | Promise<any>;
  complete?: () => void | Promise<any>;
}

export type Producer<T> =
  | ((
      this: Observable<T>,
      observer: Observer<T>
    ) => Teardown | Promise<any> | void)
  | ComplexProducer<T>;

export interface ComplexProducer<T> {
  subscribe(observer: Observer<T>): Teardown | void;
}

function doTeardown(t: Teardown) {
  if (t && typeof t === "function") {
    t();
    return;
  }
  if (
    t &&
    typeof t === "object" &&
    "cancel" in t &&
    typeof t.cancel === "function"
  ) {
    t.cancel();
    return;
  }
}

function isTeardown(t: any): t is Teardown {
  return (
    t != null &&
    (typeof t === "function" || (typeof t === "object" && "cancel" in t))
  );
}

type Teardown = Cancellation | (() => any);

export interface Cancellation {
  cancel(): void;
}
