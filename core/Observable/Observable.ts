import { Task, Consumer, Execution } from "../Task";
import { Transducer } from "./Transducer";

enum DispatchType {
  init,
  message,
  completion,
  cancellation
}

interface Ack extends Consumer<void> {}

type Frame<T, ExeCtx, ObserverCtx> =
  | {
      type: DispatchType.init;
      observation: Observation<T, ExeCtx, ObserverCtx>;
    }
  | {
      type: DispatchType.message;
      delivered: boolean;
      observation: Observation<T, ExeCtx, ObserverCtx>;
      value: T;
      acks?: Ack[];
    }
  | {
      type: DispatchType.completion;
      delivered: boolean;
      observation: Observation<T, ExeCtx, ObserverCtx>;
      acks?: Ack[];
    }
  | {
      type: DispatchType.cancellation;
      observation: Observation<T, ExeCtx, ObserverCtx>;
    };

let running = false;
let queue: Frame<any, any, any>[] = [];

function run() {
  new Task(dispatch).run(finishRunning);
}

function finishRunning() {
  run();
}

function dispatch() {
  if (running) {
    return;
  }
  running = true;
  const buffer: Frame<any, any, any>[] = [];
  while (queue.length) {
    const frame = queue.shift()!;
    switch (frame.type) {
      case DispatchType.init:
        if (frame.observation.stage === Stage.none) {
          frame.observation.stage = Stage.active;
          const cancel = frame.observation.produce.call(
            frame.observation.exeContext,
            new Observer(frame.observation)
          );
          if (cancel) {
            frame.observation.cancel = cancel;
          }
        }
        break;

      case DispatchType.message:
        if (frame.observation.stage === Stage.active) {
          frame.observation.stage = Stage.sending;
          const task = frame.observation.observer.next
            ? frame.observation.observer.next.call(
                frame.observation.observerContext,
                frame.value
              )
            : undefined;
          if (task) {
            task.run<Frame<any, any, any>>(frameDispatched, frame);
          } else {
            frameDispatched.call(frame, undefined);
          }
        } else if (frame.observation.stage === Stage.sending) {
          buffer.push(frame);
        }
        break;

      case DispatchType.completion:
        if (frame.observation.stage === Stage.active) {
          frame.observation.stage = Stage.completed;
          const task = frame.observation.observer.complete
            ? frame.observation.observer.complete.call(
                frame.observation.observerContext
              )
            : undefined;
          if (task) {
            task.run<Frame<any, any, any>>(frameDispatched, frame);
          } else {
            frameDispatched.call(frame, undefined);
          }
        } else if (frame.observation.stage === Stage.sending) {
          buffer.push(frame);
        }
        break;

      case DispatchType.cancellation:
        if (frame.observation.stage === Stage.active) {
          frame.observation.stage = Stage.cancelled;
          if (frame.observation.cancel) {
            frame.observation.cancel.call(frame.observation.exeContext);
          }
        } else if (frame.observation.stage === Stage.sending) {
          buffer.push(frame);
        }
        break;
    }
  }
  queue = buffer;
  running = false;
}

function frameDispatched<T, ExeCtx, ObserverCtx>(
  this: Frame<T, ExeCtx, ObserverCtx>,
  _value: any
) {
  if (
    (this.type === DispatchType.message ||
      this.type === DispatchType.completion) &&
    !this.delivered
  ) {
    this.delivered = true;

    this.observation.stage =
      this.type === DispatchType.completion ? Stage.completed : Stage.active;

    if (this.acks) {
      for (let i = 0; i < this.acks.length; i++) {
        this.acks[i].resolve();
      }
    }
  }
  if (!running) {
    run();
  }
}

export const observableSymbol = Symbol("is Observable");

interface Cancellation<ExeCtx> {
  (this: ExeCtx): void;
}
export interface Subscription {
  closed: boolean;
  cancel(): void;
}
export interface IObserver<T, ObserverCtx = any> {
  next(this: ObserverCtx, value: T): Task<any>;
  complete(this: ObserverCtx): Task<any>;
}
export interface IObservable<T> {
  [observableSymbol]: boolean;
  subscribe<ObserverCtx = any>(
    observer: PartialObserver<T, ObserverCtx>,
    observerContext?: ObserverCtx
  ): Subscription;
  pipe<U>(transducer: Transducer<T, U, any>): IObservable<U>;
}
export interface PartialObserver<T, ObserverCtx = any> {
  next?: (this: ObserverCtx, value: T) => void | Task<any>;
  complete?: (this: ObserverCtx) => void | Task<any>;
}
interface Producer<T, ExeCtx> {
  (this: ExeCtx, observer: IObserver<T>): void | Cancellation<ExeCtx>;
}
enum Stage {
  none,
  active,
  sending,
  completed,
  cancelled
}
interface Observation<T, ExeCtx, ObserverCtx> {
  stage: Stage;

  produce: Producer<T, ExeCtx>;
  cancel?: Cancellation<ExeCtx>;
  exeContext: ExeCtx;

  observer: PartialObserver<T, ObserverCtx>;
  observerContext: ObserverCtx;
}
type Pipeline<IN, OUT, X = any> = {
  through:
    | Transducer<IN, OUT, any>
    | [Pipeline<IN, X>, Transducer<X, OUT, any>];
};

export class Observable<T, ExeCtx = any, ExeArg = any>
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
    produce: Producer<T, ExeCtx>,
    getContext: (arg: ExeArg) => ExeCtx,
    arg: ExeArg
  );
  constructor(produce: Producer<T, any>);
  constructor(
    protected _produce: Producer<T, ExeCtx>,
    protected _getContext?: (arg: ExeArg) => ExeCtx,
    protected _arg?: ExeArg
  ) {}

  subscribe(observer: PartialObserver<T>): Subscription;
  subscribe<ObserverCtx = any>(
    observer: PartialObserver<T, ObserverCtx>,
    observerContext?: ObserverCtx
  ): Subscription;
  subscribe<ObserverCtx = any>(
    observer: PartialObserver<T, ObserverCtx>,
    observerContext?: ObserverCtx
  ): Subscription {
    const exeContext = this._getContext
      ? this._getContext(this._arg!)
      : ((undefined as any) as ExeCtx);
    const observation: Observation<T, ExeCtx, ObserverCtx> = {
      stage: Stage.none,
      observer,
      observerContext: (observerContext || observer) as ObserverCtx,
      exeContext,
      produce: this._produce
    };
    const exe = new ObservableSubscription(observation);
    queue.push({
      type: DispatchType.init,
      observation
    });
    if (!running) {
      run();
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

class ObservableSubscription<T, ExeCtx, ObserverCtx> implements Subscription {
  get closed() {
    return (
      this._observation.stage === Stage.cancelled ||
      this._observation.stage === Stage.completed
    );
  }
  constructor(private _observation: Observation<T, ExeCtx, ObserverCtx>) {}

  cancel() {
    const frame: Frame<T, ExeCtx, ObserverCtx> = {
      type: DispatchType.cancellation,
      observation: this._observation
    };
    queue.push(frame);
    if (!running) {
      run();
    }
  }
}

class Observer<T, ExeCtx, ObserverCtx> implements IObserver<T, ObserverCtx> {
  constructor(private _observation: Observation<T, ExeCtx, ObserverCtx>) {}

  next(value: T) {
    const frame: Frame<T, ExeCtx, ObserverCtx> = {
      type: DispatchType.message,
      delivered: false,
      observation: this._observation,
      value
    };
    queue.push(frame);
    if (!running) {
      run();

      if (frame.delivered) {
        return Task.resolve();
      }
    }
    return new Task(frameDeliveryProducer, frameDeliveryContext, frame);
  }

  complete() {
    const frame: Frame<T, ExeCtx, ObserverCtx> = {
      type: DispatchType.completion,
      delivered: false,
      observation: this._observation
    };
    queue.push(frame);
    if (!running) {
      run();

      if (frame.delivered) {
        return Task.resolve();
      }
    }
    return new Task(frameDeliveryProducer, frameDeliveryContext, frame);
  }
}

function frameDeliveryProducer(
  this: Frame<any, any, any>,
  consumer: Consumer<void>
) {
  if (
    this.type === DispatchType.init ||
    this.type === DispatchType.cancellation
  ) {
    consumer.resolve();
  } else {
    if (this.delivered) {
      consumer.resolve();
    } else {
      this.acks = this.acks || [];
      this.acks.push(consumer);
    }
  }
}

function frameDeliveryContext(
  frame: Frame<any, any, any>
): Frame<any, any, any> {
  return frame;
}

// --

interface PipingArgument<T, U, ExeCtx, ExeArg> {
  produce: Producer<T, ExeCtx>;
  getContext?: (arg: ExeArg) => ExeCtx;
  arg?: ExeArg;
  pipeline: Pipeline<T, U>;
}

interface PipingContext<T, U, ExeCtx, ExeArg>
  extends PipingArgument<T, U, ExeCtx, ExeArg> {
  pipes?: PipingObserver<any, any, any>[];
  exeCtx?: ExeCtx;
  cancel?: Cancellation<ExeCtx>;
}

class PipingObservable<T, U, ExeCtx, ExeArg> extends Observable<
  U,
  PipingContext<T, U, ExeCtx, ExeArg>,
  PipingArgument<T, U, ExeCtx, ExeArg>
> {
  constructor(
    pipeline: Pipeline<T, U>,
    produce: Producer<T, ExeCtx>,
    getContext: (arg: ExeArg) => ExeCtx,
    arg: ExeArg
  );
  constructor(pipeline: Pipeline<T, U>, produce: Producer<T, any>);
  constructor(
    protected _ogPipeline: Pipeline<T, U>,
    protected _ogProduce: Producer<T, ExeCtx>,
    protected _ogGetContext?: (arg: ExeArg) => ExeCtx,
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
    return new PipingObservable<T, Y, ExeCtx, ExeArg>(
      { through: [this._ogPipeline, transducer] },
      this._ogProduce,
      this._ogGetContext!,
      this._ogArg!
    );
  }
}

function pipingContext<T, U, ExeCtx, ExeArg>(
  arg: PipingArgument<T, U, ExeCtx, ExeArg>
): PipingContext<T, U, ExeCtx, ExeArg> {
  return arg;
}

function pipingProduce<T, U, ExeCtx, ExeArg>(
  this: PipingContext<T, U, ExeCtx, ExeArg>,
  observer: IObserver<U>
) {
  this.exeCtx = this.getContext
    ? this.getContext(this.arg!)
    : ((undefined as any) as ExeCtx);
  const [pipes, po] = pipeObservers(this.pipeline, observer);
  this.pipes = pipes;
  const cancel = this.produce.call(this.exeCtx, po);
  if (cancel) {
    this.cancel = cancel;
  }
  return pipingCancel;
}

function pipeObservers<T, U, X>(
  pipeline: Pipeline<T, U, X>,
  innerObserver: IObserver<U>
): [
  [PipingObserver<any, U, any>, ...PipingObserver<any, any, any>[]],
  PipingObserver<T, any, any>
] {
  const { through } = pipeline;
  if (Array.isArray(through)) {
    const [nextPipe, xt] = through;
    const po = new PipingObserver(xt, innerObserver);
    const [all, outerObserver] = pipeObservers(nextPipe, po);
    return [[po, ...all], outerObserver];
  } else {
    const po = new PipingObserver<T, U, any>(through, innerObserver);
    return [[po], po];
  }
}

function pipingCancel<T, U, ExeCtx, ExeArg>(
  this: PipingContext<T, U, ExeCtx, ExeArg>
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

class PipingObserver<T, U, XdCtx> implements IObserver<T> {
  exeCtx: XdCtx;

  constructor(private _xt: Transducer<T, U, XdCtx>, _observer: IObserver<U>) {
    this.exeCtx = this._xt.start(_observer);
  }

  next(value: T): Task<any> {
    return this._xt.next.call(this.exeCtx, value);
  }

  complete(): Task<any> {
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
  sending: Execution | null;
  drained: boolean;
  cancelled: boolean;
}

function asyncSourceContext<T>(arg: AsyncSourceArg<T>): AsyncSourceContext<T> {
  return {
    asyncIterable: arg,
    retrieving: false,
    drained: false,
    cancelled: false,
    sending: null
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
      this.sending = observer
        .complete()
        .run<typeof this>(asyncSourceIterate, this);
    } else {
      this.sending = observer
        .next(iteration.value)
        .run<typeof this>(asyncSourceIterate, this);
    }
  };
  const asi: (this: AsyncSourceContext<T>) => void = asyncSourceIterate;
  asi.call(this);

  return asyncSourceCancel;
}

function asyncSourceCancel<T>(this: AsyncSourceContext<T>) {
  this.cancelled = true;
  if (this.sending) {
    this.sending.cancel();
  }
  if (!this.retrieving && this.asyncIterator && this.asyncIterator.return) {
    this.asyncIterator.return();
  }
}

function asyncSourceIterate<T>(this: AsyncSourceContext<T>) {
  if (this.cancelled && this.asyncIterator && this.asyncIterator.return) {
    this.asyncIterator.return();
  }
  if (this.cancelled || this.drained) {
    return;
  }

  this.retrieving = true;
  (
    this.asyncIterator ||
    (this.asyncIterator = this.asyncIterable[Symbol.asyncIterator]())
  )
    .next()
    .then(this.resultHandler);
}

// ::of async iterable

type SyncSourceArg<T> = Iterable<T>;

interface SyncSourceContext<T> {
  iterable: Iterable<T>;
  iterator?: Iterator<T>;
  observer?: IObserver<T>;
  sending: Execution | null;
  cancelled: boolean;
  drained: boolean;
}

function syncSourceContext<T>(arg: SyncSourceArg<T>): SyncSourceContext<T> {
  return { iterable: arg, sending: null, cancelled: false, drained: false };
}

function syncSourceProduce<T>(
  this: SyncSourceContext<T>,
  observer: IObserver<T>
) {
  this.observer = observer;
  const asi: (this: SyncSourceContext<T>) => void = syncSourceIterate;
  asi.call(this);

  return syncSourceCancel;
}

function syncSourceCancel<T>(this: SyncSourceContext<T>) {
  this.cancelled = true;
  if (this.sending) {
    this.sending.cancel();
  }
  if (this.iterator && this.iterator.return) {
    this.iterator.return();
  }
}

function syncSourceIterate<T>(this: SyncSourceContext<T>) {
  this.sending = null;

  if (!this.observer) {
    return;
  }

  if (this.drained || this.cancelled) {
    return;
  }

  const iteration = (
    this.iterator || (this.iterator = this.iterable[Symbol.iterator]())
  ).next();

  if (iteration.done) {
    this.drained = true;
    this.sending = this.observer
      .complete()
      .run<typeof this>(syncSourceIterate, this);
  } else {
    this.sending = this.observer
      .next(iteration.value)
      .run<typeof this>(syncSourceIterate, this);
  }
}

// ::of single value

type UnitArg<T> = T;

interface UnitContext<T> {
  value: T;
  closed: boolean;
  sending?: Execution;
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
  this.sending = observer.next(this.value).run<typeof this>(unitClose, this);

  return unitCancel;
}

function unitClose<T>(this: UnitContext<T>) {
  if (this.closed) {
    return;
  }
  this.closed = true;
  this.observer!.complete();
}

function unitCancel<T>(this: UnitContext<T>) {
  if (this.closed) {
    return;
  }
  this.closed = true;
  if (this.sending) {
    this.sending.cancel();
  }
}
