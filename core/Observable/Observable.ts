import { Transducer } from "./Transducer";

enum Stage {
  active,
  completed,
  cancelled
}

interface Observation<T, ExecutionContext, ObserverContext> {
  stage: Stage;
  sending: Frame<T, ExecutionContext, ObserverContext> | undefined;

  cancel?: Cancellation<ExecutionContext>;
  exeContext: ExecutionContext;

  observer: PartialObserver<T, ObserverContext>;
  observerContext: ObserverContext;
}

enum DispatchType {
  message,
  completion,
  cancellation
}

interface Ack {
  (v: void): any;
}

type Frame<T, ExecutionContext, ObserverContext> = {
  delivered: boolean;
  observation: Observation<T, ExecutionContext, ObserverContext>;
} & (
  | {
      type: DispatchType.message;
      value: T;
      deliveryAck: Ack;
    }
  | {
      type: DispatchType.completion;
      deliveryAck: Ack;
    }
  | {
      type: DispatchType.cancellation;
    });

let runScheduled = false;
let running = false;
let queue: Frame<any, any, any>[] = [];

function run() {
  if (runScheduled) {
    return;
  }
  runScheduled = true;
  Promise.resolve().then(dispatch);
}

function dispatch() {
  // debugger;
  runScheduled = false;
  if (running) {
    return;
  }
  running = true;
  const buffer: Frame<any, any, any>[] = [];
  for (let i = 0; i < queue.length; i++) {
    const frame = queue[i];
    if (frame.observation.stage !== Stage.active) {
      // debugger;
      continue;
    }
    if (frame.observation.sending) {
      // debugger;
      buffer.push(frame);
    } else {
      frame.observation.sending = frame;
      switch (frame.type) {
        case DispatchType.message:
          // debugger;
          const nextAck: Promise<any> =
            (frame.observation.observer.next &&
              frame.observation.observer.next.call(
                frame.observation.observerContext,
                frame.value
              )) ||
            Promise.resolve();
          nextAck.then(() => {
            frameDeliveryConfirm(frame);
          });
          break;

        case DispatchType.completion:
          // debugger;
          const completeAck: Promise<any> =
            (frame.observation.observer.complete &&
              frame.observation.observer.complete.call(
                frame.observation.observerContext
              )) ||
            Promise.resolve();
          completeAck.then(() => {
            frameDeliveryConfirm(frame);
          });
          break;

        case DispatchType.cancellation:
          frame.delivered = true;
          frame.observation.stage = Stage.cancelled;
          if (frame.observation.cancel) {
            frame.observation.cancel.call(frame.observation.exeContext);
          }
          frame.observation.sending = undefined;
          // debugger;
          break;
      }
    }
  }
  queue = buffer;
  running = false;
}

export const observableSymbol = Symbol("is Observable");

interface Cancellation<ExecutionContext> {
  (this: ExecutionContext): void;
}
export interface Subscription {
  closed: boolean;
  cancel(): void;
}
export interface IObserver<T, ObserverContext = any> {
  next(this: ObserverContext, value: T): Promise<any>;
  complete(this: ObserverContext): Promise<any>;
}
export interface SkippingObserver<T, ObserverContext = any> {
  next: (this: ObserverContext, value: T) => void | Promise<any>;
  complete: (this: ObserverContext) => void | Promise<any>;
}
export interface PartialObserver<T, ObserverContext = any> {
  next?: (this: ObserverContext, value: T) => void | Promise<any>;
  complete?: (this: ObserverContext) => void | Promise<any>;
}
export interface IObservable<T> {
  [observableSymbol]: boolean;
  subscribe<ObserverContext = any>(
    observer: PartialObserver<T, ObserverContext>,
    observerContext?: ObserverContext
  ): Subscription;
  pipe<U>(transducer: Transducer<T, U, any>): IObservable<U>;
}
interface Producer<T, ExecutionContext> {
  (this: ExecutionContext, observer: IObserver<T>): void | Cancellation<
    ExecutionContext
  >;
}
type Pipeline<IN, OUT, X = any> = {
  through:
    | Transducer<IN, OUT, any>
    | [Pipeline<IN, X>, Transducer<X, OUT, any>];
};

export class Observable<T, ExecutionContext = any, ExeArg = any>
  implements IObservable<T> {
  [observableSymbol] = true;
  static symbol = observableSymbol;
  static [Symbol.hasInstance](instance: unknown) {
    return (
      typeof instance === "object" &&
      instance !== null &&
      (instance as any)[observableSymbol]
    );
  }

  public static of<T>(
    source: AsyncIterable<T> | Iterable<T> | T
  ): Observable<T> {
    if (typeof source === "object" && Symbol.asyncIterator in source) {
      const asyncSource = source as AsyncIterable<T>;
      return new Observable<T, AsyncSourceContext<T>, AsyncSourceArg<T>>(
        asyncSourceProduce,
        asyncSourceContext,
        asyncSource
      );
    }
    if (typeof source === "object" && Symbol.iterator in source) {
      const syncSource = source as Iterable<T>;
      return new Observable<T, SyncSourceContext<T>, SyncSourceArg<T>>(
        syncSourceProduce,
        syncSourceContext,
        syncSource
      );
    }
    const unitSource = source as T;
    return new Observable<T, UnitContext<T>, UnitArg<T>>(
      unitProducer,
      unitContext,
      unitSource
    );
  }

  constructor(
    produce: Producer<T, ExecutionContext>,
    getContext: (arg: ExeArg) => ExecutionContext,
    arg: ExeArg
  );
  constructor(produce: Producer<T, any>);
  constructor(
    protected _produce: Producer<T, ExecutionContext>,
    protected _getContext?: (arg: ExeArg) => ExecutionContext,
    protected _arg?: ExeArg
  ) {}

  subscribe(observer: PartialObserver<T>): Subscription;
  subscribe<ObserverContext = any>(
    observer: PartialObserver<T, ObserverContext>,
    observerContext?: ObserverContext
  ): Subscription;
  subscribe<ObserverContext = any>(
    observer: PartialObserver<T, ObserverContext>,
    observerContext?: ObserverContext
  ): Subscription {
    const exeContext = this._getContext
      ? this._getContext(this._arg!)
      : ((undefined as any) as ExecutionContext);

    const observation: Observation<T, ExecutionContext, ObserverContext> = {
      stage: Stage.active,
      sending: undefined,
      observer,
      observerContext: (observerContext || observer) as ObserverContext,
      exeContext
    };

    const exe = new ObservableSubscription(observation);

    const cancel = this._produce.call(
      observation.exeContext,
      new Observer(observation)
    );

    if (cancel) {
      observation.cancel = cancel;
    }

    return exe;
  }

  pipe<U>(transducer: Transducer<T, U, any>): IObservable<U> {
    return new PipingObservable(
      { through: transducer },
      this._produce,
      this._getContext!,
      this._arg!
    );
  }
}

class ObservableSubscription<T, ExecutionContext, ObserverContext>
  implements Subscription {
  get closed() {
    return (
      this._observation.stage === Stage.cancelled ||
      this._observation.stage === Stage.completed
    );
  }
  constructor(
    private _observation: Observation<T, ExecutionContext, ObserverContext>
  ) {}

  cancel() {
    const frame: Frame<T, ExecutionContext, ObserverContext> = {
      type: DispatchType.cancellation,
      observation: this._observation,
      delivered: true
    };
    queue.push(frame);
    run();
  }
}

class Observer<T, ExecutionContext, ObserverContext>
  implements IObserver<T, ObserverContext> {
  constructor(
    private _observation: Observation<T, ExecutionContext, ObserverContext>
  ) {}

  next(value: T) {
    if (!this._observation.observer.next) {
      return Promise.resolve();
    }
    // debugger;

    return new Promise<void>(r => {
      const frame: Frame<T, ExecutionContext, ObserverContext> = {
        type: DispatchType.message,
        observation: this._observation,
        value,
        delivered: false,
        deliveryAck: r
      };
      // debugger;

      queue.push(frame);
      run();
    });
  }

  complete() {
    if (!this._observation.observer.complete) {
      return Promise.resolve();
    }

    return new Promise<void>(r => {
      const frame: Frame<T, ExecutionContext, ObserverContext> = {
        type: DispatchType.completion,
        observation: this._observation,
        delivered: false,
        deliveryAck: r
      };
      // debugger;

      queue.push(frame);
      run();
    });
  }
}

function frameDeliveryConfirm<T, U, V>(frame: Frame<T, U, V>) {
  if (
    frame.type === DispatchType.completion ||
    frame.type === DispatchType.message
  ) {
    frame.observation.sending = undefined;
    frame.delivered = true;
    frame.deliveryAck();
    // debugger;
  }

  run();
}

// --

interface PipingArgument<T, U, ExecutionContext, ExeArg> {
  produce: Producer<T, ExecutionContext>;
  getContext?: (arg: ExeArg) => ExecutionContext;
  arg?: ExeArg;
  pipeline: Pipeline<T, U>;
}

interface PipingContext<T, U, ExecutionContext, ExeArg>
  extends PipingArgument<T, U, ExecutionContext, ExeArg> {
  pipes?: PipingObserver<any, any, any>[];
  exeCtx?: ExecutionContext;
  cancel?: Cancellation<ExecutionContext>;
}

class PipingObservable<T, U, ExecutionContext, ExeArg> extends Observable<
  U,
  PipingContext<T, U, ExecutionContext, ExeArg>,
  PipingArgument<T, U, ExecutionContext, ExeArg>
> {
  constructor(
    pipeline: Pipeline<T, U>,
    produce: Producer<T, ExecutionContext>,
    getContext: (arg: ExeArg) => ExecutionContext,
    arg: ExeArg
  );
  constructor(pipeline: Pipeline<T, U>, produce: Producer<T, any>);
  constructor(
    protected _ogPipeline: Pipeline<T, U>,
    protected _ogProduce: Producer<T, ExecutionContext>,
    protected _ogGetContext?: (arg: ExeArg) => ExecutionContext,
    protected _ogArg?: ExeArg
  ) {
    super(pipingProduce, pipingContext, {
      produce: _ogProduce,
      getContext: _ogGetContext,
      arg: _ogArg,
      pipeline: _ogPipeline
    });
  }

  pipe<Y>(transducer: Transducer<U, Y, any>): IObservable<Y> {
    return new PipingObservable<T, Y, ExecutionContext, ExeArg>(
      { through: [this._ogPipeline, transducer] },
      this._ogProduce,
      this._ogGetContext!,
      this._ogArg!
    );
  }
}

function pipingContext<T, U, ExecutionContext, ExeArg>(
  arg: PipingArgument<T, U, ExecutionContext, ExeArg>
): PipingContext<T, U, ExecutionContext, ExeArg> {
  return arg;
}

function pipingProduce<T, U, ExecutionContext, ExeArg>(
  this: PipingContext<T, U, ExecutionContext, ExeArg>,
  observer: SkippingObserver<U>
) {
  this.exeCtx = this.getContext
    ? this.getContext(this.arg!)
    : ((undefined as any) as ExecutionContext);
  const [pipes, po] = pipeObservers(this.pipeline, observer);
  this.pipes = pipes;
  const cancel = this.produce.call(this.exeCtx, new PipingObserverAdapter(po));
  if (cancel) {
    this.cancel = cancel;
  }
  return pipingCancel;
}

function pipeObservers<T, U, X>(
  pipeline: Pipeline<T, U, X>,
  innerObserver: SkippingObserver<U>
): [
  [PipingObserver<any, U, any>, ...PipingObserver<any, any, any>[]],
  PipingObserver<T, any, any>
] {
  const { through } = pipeline;
  if (Array.isArray(through)) {
    const [nextPipe, xf] = through;
    const po = new PipingObserver(xf, innerObserver);
    const [all, outerObserver] = pipeObservers(nextPipe, po);
    return [[po, ...all], outerObserver];
  } else {
    const po = new PipingObserver<T, U, any>(through, innerObserver);
    return [[po], po];
  }
}

function pipingCancel<T, U, ExecutionContext, ExeArg>(
  this: PipingContext<T, U, ExecutionContext, ExeArg>
) {
  if (this.cancel) {
    this.cancel.call(this.exeCtx!);
  }
  if (this.pipes) {
    for (const pipe of this.pipes) {
      pipe.cancel();
    }
  }
}

class PipingObserverAdapter<T, U, XdCtx> implements IObserver<T, XdCtx> {
  constructor(private _observer: PipingObserver<T, U, XdCtx>) {}

  next(value: T) {
    return this._observer.next(value) || Promise.resolve();
  }

  complete() {
    return this._observer.complete() || Promise.resolve();
  }
}

class PipingObserver<T, U, XdCtx> implements SkippingObserver<T, XdCtx> {
  exeCtx: XdCtx;

  constructor(
    private _xt: Transducer<T, U, XdCtx>,
    _observer: SkippingObserver<U>
  ) {
    this.exeCtx = this._xt.start(_observer);
  }

  next(value: T) {
    return this._xt.next.call(this.exeCtx, value);
  }

  complete() {
    return this._xt.complete.call(this.exeCtx);
  }

  cancel() {
    if (this._xt && this._xt.cancel) {
      this._xt.cancel.call(this.exeCtx);
    }
  }
}

// ::of async iterable

type AsyncSourceArg<T> = AsyncIterable<T>;

interface AsyncSourceContext<T> {
  asyncIterable: AsyncIterable<T>;
  asyncIterator?: AsyncIterator<T>;
  resultHandler?: (r: IteratorResult<T>) => void;
  retrieving: boolean;
  drained: boolean;
  cancelled: boolean;
}

function asyncSourceContext<T>(arg: AsyncSourceArg<T>): AsyncSourceContext<T> {
  return {
    asyncIterable: arg,
    retrieving: false,
    drained: false,
    cancelled: false
  };
}

function asyncSourceProduce<T>(
  this: AsyncSourceContext<T>,
  observer: IObserver<T>
) {
  this.resultHandler = (iteration: IteratorResult<T>) => {
    this.retrieving = false;
    if (this.cancelled && this.asyncIterator && this.asyncIterator.return) {
      this.asyncIterator.return();
    }
    if (this.drained || this.cancelled) {
      return;
    }
    if (iteration.done) {
      this.drained = true;
      observer.complete().then(() => asyncSourceIterate(this));
    } else {
      observer.next(iteration.value).then(() => asyncSourceIterate(this));
    }
  };
  asyncSourceIterate(this);

  return asyncSourceCancel;
}

function asyncSourceCancel<T>(this: AsyncSourceContext<T>) {
  this.cancelled = true;
  if (!this.retrieving && this.asyncIterator && this.asyncIterator.return) {
    this.asyncIterator.return();
  }
}

function asyncSourceIterate<T>(context: AsyncSourceContext<T>) {
  if (
    context.cancelled &&
    context.asyncIterator &&
    context.asyncIterator.return
  ) {
    context.asyncIterator.return();
  }
  if (context.cancelled || context.drained) {
    return;
  }

  context.retrieving = true;
  (
    context.asyncIterator ||
    (context.asyncIterator = context.asyncIterable[Symbol.asyncIterator]())
  )
    .next()
    .then(context.resultHandler);
}

// ::of async iterable

type SyncSourceArg<T> = Iterable<T>;

interface SyncSourceContext<T> {
  iterable: Iterable<T>;
  iterator?: Iterator<T>;
  observer?: IObserver<T>;
  cancelled: boolean;
  drained: boolean;
}

function syncSourceContext<T>(arg: SyncSourceArg<T>): SyncSourceContext<T> {
  return { iterable: arg, cancelled: false, drained: false };
}

function syncSourceProduce<T>(
  this: SyncSourceContext<T>,
  observer: IObserver<T>
) {
  this.observer = observer;
  syncSourceIterate(this);

  return syncSourceCancel;
}

function syncSourceCancel<T>(this: SyncSourceContext<T>) {
  this.cancelled = true;
  if (this.iterator && this.iterator.return) {
    this.iterator.return();
  }
}

function syncSourceIterate<T>(context: SyncSourceContext<T>) {
  if (!context.observer) {
    return;
  }

  if (context.drained || context.cancelled) {
    return;
  }

  const iteration = (
    context.iterator || (context.iterator = context.iterable[Symbol.iterator]())
  ).next();

  if (iteration.done) {
    context.drained = true;
    context.observer.complete().then(() => syncSourceIterate(context));
  } else {
    context.observer
      .next(iteration.value)
      .then(() => syncSourceIterate(context));
  }
}

// ::of single value

type UnitArg<T> = T;

interface UnitContext<T> {
  value: T;
  closed: boolean;
  observer?: IObserver<T>;
}

function unitContext<T>(arg: UnitArg<T>): UnitContext<T> {
  return {
    value: arg,
    closed: false
  };
}

function unitProducer<T>(this: UnitContext<T>, observer: IObserver<T>) {
  this.observer = observer;
  observer.next(this.value).then(() => unitClose(this));

  return unitCancel;
}

function unitClose<T>(context: UnitContext<T>) {
  if (context.closed) {
    return;
  }
  context.closed = true;
  context.observer!.complete();
}

function unitCancel<T>(this: UnitContext<T>) {
  if (this.closed) {
    return;
  }
  this.closed = true;
}
