export function observable<T>(produce: Producer<T, void>): Observable<T>;
export function observable<T, EXE, ARG>(
  produce: Producer<T, EXE>,
  getContext: (arg: ARG) => EXE,
  arg: ARG
): ContextualObservable<T, EXE, ARG>;
export function observable<T>(
  produce: Producer<T, any>,
  getContext?: (arg: any) => any,
  arg?: any
): Observable<T> {
  const o: ContextualObservable<T, any, any> = {
    produce,
    getContext: getContext!,
    arg: arg!,
    [observableSymbol]: true,
    subscribe,
    pipe
  };
  return o;
}

function subscribe<T>(
  this: ContextualObservable<T, any, any>,
  observer: Subscriber<T>
): Subscription;
function subscribe<T, EXE, ObserverContext = any>(
  this: ContextualObservable<T, EXE, any>,
  observer: Subscriber<T, ObserverContext>,
  observerContext?: ObserverContext
): Subscription;
function subscribe<T, EXE, ObserverContext = any>(
  this: ContextualObservable<T, EXE, any>,
  observer: Subscriber<T, ObserverContext>,
  observerContext?: ObserverContext
): Subscription {
  const exeContext = this.getContext
    ? this.getContext(this.arg!)
    : ((undefined as any) as EXE);

  const observation: Observation<T, EXE, ObserverContext> = {
    stage: Stage.active,
    observer,
    observerContext: (observerContext || observer) as ObserverContext,
    exeContext
  };

  const exe = observableSubscription(observation);

  const cancel = this.produce.call(
    observation.exeContext,
    observerForProducer(observation)
  );

  if (typeof cancel === "function") {
    observation.cancel = cancel;
  }

  return exe;
}

function pipe<T, U>(
  this: ContextualObservable<T, any, any>,
  transducer: (it: Observable<T>) => U
): U {
  return transducer(this);
}

function observableSubscription<T, EXE>(
  _observation: Observation<T, EXE, any>
): Subscription {
  const os: ObservationSubscription<T, EXE> = {
    _observation,
    get closed() {
      return (
        this._observation.stage === Stage.cancelled ||
        this._observation.stage === Stage.completed
      );
    },
    cancel: cancelObservableSubscription
  };
  return os;
}

interface ObservationSubscription<T, EXE> extends Subscription {
  _observation: Observation<T, EXE, any>;
}

function cancelObservableSubscription<T, EXE>(
  this: ObservationSubscription<T, EXE>
) {
  this._observation.stage = Stage.cancelled;
  const cancel = this._observation.cancel;
  const exeContext = this._observation.exeContext;
  if (cancel) {
    (this._observation.sending || Promise.resolve()).then(() => {
      cancel.call(exeContext);
    });
  }
}

function observerForProducer<T, EXE, OBS>(
  observation: Observation<T, EXE, OBS>
): Observer<T> {
  return { next, complete };

  function next(this: void, value: T): Promise<any> {
    const { stage, observer, observerContext, sending } = observation;

    if (stage !== Stage.active || !observer.next) {
      return Promise.resolve();
    }
    // debugger;

    if (sending) {
      return sending.then(() => {
        observation.sending = undefined;
        return next(value);
      });
    }

    const nextSending = observer.next.call(observerContext, value) || undefined;

    observation.sending = nextSending;

    return nextSending || Promise.resolve();
  }

  function complete(this: void): Promise<any> {
    const { stage, observer, observerContext, sending } = observation;

    if (stage !== Stage.active || !observer.complete) {
      return Promise.resolve();
    }
    // debugger;

    if (sending) {
      return sending.then(() => {
        observation.sending = undefined;
        return complete();
      });
    }

    observation.stage = Stage.completed;

    const nextSending = observer.complete.call(observerContext) || undefined;

    observation.sending = nextSending;

    return nextSending || Promise.resolve();
  }
}

enum Stage {
  active,
  completed,
  cancelled
}

interface Observation<T, ExecutionContext, ObserverContext> {
  stage: Stage;
  sending?: Promise<any>;

  cancel?: Cancellation<ExecutionContext>;
  exeContext: ExecutionContext;

  observer: Subscriber<T, ObserverContext>;
  observerContext: ObserverContext;
}

export const observableSymbol = Symbol("is observable");

interface Cancellation<ExecutionContext> {
  (this: ExecutionContext): void;
}
export interface Subscription {
  closed: boolean;
  cancel(): void;
}
export interface Observer<T, ObserverContext = any> {
  next(this: ObserverContext, value: T): Promise<any>;
  complete(this: ObserverContext): Promise<any>;
}

export interface Subscriber<T, ObserverContext = any> {
  next?: (this: ObserverContext, value: T) => void | Promise<any>;
  complete?: (this: ObserverContext) => void | Promise<any>;
}

export interface Observable<T> {
  [observableSymbol]: boolean;
  subscribe<SubscriberContext = any>(
    observer: Subscriber<T, SubscriberContext>,
    observerContext?: SubscriberContext
  ): Subscription;
  pipe<U>(transducer: (it: Observable<T>) => Observable<U>): Observable<U>;
}

export interface Producer<T, ExecutionContext = any> {
  (this: ExecutionContext, observer: Observer<T>):
    | void
    | Cancellation<ExecutionContext>
    | Promise<any>;
}

interface ContextualObservable<T, EXE, ARG> extends Observable<T> {
  produce: Producer<T, EXE>;
  getContext: (arg: ARG) => EXE;
  arg: ARG;
}
