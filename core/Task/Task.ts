// scheduling

let running = false;
const queue: Job<any, any, any>[] = [];

function dispatch(): void {
  if (!running) {
    running = true;
    while (queue.length) {
      const job = queue.shift()!;
      switch (job.stage) {
        case Stage.none:
          job.stage = Stage.active;
          const cancel = job.produce.call(
            job.exeContext,
            new TaskConsumer<any>(job)
          );
          if (cancel) {
            job.cancel = cancel;
          }
          break;

        case Stage.cancelled:
          if (job.cancel) {
            job.cancel.call(job.exeContext);
          }
          break;

        case Stage.completed:
          job.consume.call(job.consumeContext, job.result!);
          break;
      }
    }
    running = false;
  }
}

// Task

export interface Cancellation<ExeCtx> {
  (this: ExeCtx): void;
}
export interface Consumer<T> {
  resolve(value: T): void;
}
interface Producer<T, ExeCtx> {
  (this: ExeCtx, consumer: Consumer<T>): void | Cancellation<ExeCtx>;
}
export interface Execution {
  closed: boolean;
  cancel(): void;
}
enum Stage {
  none,
  active,
  completed,
  cancelled
}
interface Job<T, ExeCtx, ConsumeCtx> {
  stage: Stage;
  result?: T;

  produce: Producer<T, ExeCtx>;
  cancel?: Cancellation<ExeCtx>;
  exeContext: ExeCtx;

  consume: (this: ConsumeCtx, value: T) => void;
  consumeContext: ConsumeCtx;
}

export class Task<T = void, ExeCtx = any, ExeArg = any> {
  public static resolve(): Task<undefined>;
  public static resolve<U>(value: U): Task<U>;
  public static resolve<U>(value?: U): Task<U> {
    return new Task<U, U, U>(valueProducer, valueContext, (value as any) as U);
  }

  private static _resolved: Task<undefined> | null = null;
  public static get resolved() {
    return Task._resolved
      ? Task._resolved
      : (Task._resolved = Task.resolve(undefined));
  }

  public static all<T extends any[]>(
    tasks: { [id in keyof T]: Task<T[id]> }
  ): Task<T> {
    if (tasks.length === 0) {
      return Task.resolve(([] as unknown) as T);
    }
    if (tasks.length === 1) {
      return tasks[0].map<T>(singleToArray);
    }
    return new JoinedTask<T>(tasks);
  }

  constructor(
    produce: Producer<T, ExeCtx>,
    getContext: (arg: ExeArg) => ExeCtx,
    arg: ExeArg
  );
  constructor(produce: Producer<T, any>);
  constructor(
    private _produce: Producer<T, ExeCtx>,
    private _getContext?: (arg: ExeArg) => ExeCtx,
    private _arg?: ExeArg
  ) {}

  run<ConsumeCtx>(
    consume: (this: ConsumeCtx, value: T) => void,
    consumeContext?: ConsumeCtx
  ): Execution {
    const exeContext = this._getContext
      ? this._getContext(this._arg!)
      : ((undefined as any) as ExeCtx);
    const job: Job<T, ExeCtx, ConsumeCtx> = {
      stage: Stage.none,
      consume,
      consumeContext: consumeContext as ConsumeCtx,
      exeContext,
      produce: this._produce
    };
    const exe = new TaskExecution(job);
    queue.push(job);
    if (!running) {
      dispatch();
    }
    return exe;
  }

  map<U>(xt: (value: T) => U): Task<U> {
    return new ComplexTask({
      produce: this._produce,
      getContext: this._getContext,
      arg: this._arg,
      pipe: { through: xt }
    });
  }

  bind<U>(xt: (value: T) => Task<U>): Task<U> {
    return new FollowingTask<T, U>({ task: this, followUp: xt });
  }
}

class TaskExecution implements Execution {
  get closed() {
    return (
      this._job.stage === Stage.completed || this._job.stage === Stage.cancelled
    );
  }

  constructor(private _job: Job<any, any, any>) {}

  cancel() {
    if (this._job.stage === Stage.none || this._job.stage === Stage.active) {
      this._job.stage = Stage.cancelled;
      const pos = queue.indexOf(this._job);
      if (pos >= 0) {
        queue.splice(pos, 1);
      } else {
        queue.push(this._job);
        if (!running) {
          dispatch();
        }
      }
    }
  }
}

class TaskConsumer<T> implements Consumer<T> {
  constructor(private _job: Job<T, any, any>) {}

  resolve(value: T) {
    if (this._job.stage === Stage.active) {
      this._job.stage = Stage.completed;
      this._job.result = value;
      queue.push(this._job);
      if (!running) {
        dispatch();
      }
    }
  }
}

function valueProducer<T>(this: T, consumer: Consumer<T>) {
  consumer.resolve(this);
}

function valueContext<T>(arg: T): T {
  return arg;
}

// -- .map helper class

interface ComplexTaskArgument<T, ExeArg, ExeCtx, U> {
  produce: Producer<T, ExeCtx>;
  getContext: undefined | ((arg: ExeArg) => ExeCtx);
  arg: undefined | (ExeArg);

  pipe: Pipeline<T, U, any>;
}

interface ComplexTaskContext<T, ExeArg, ExeCtx, U>
  extends ComplexTaskArgument<T, ExeArg, ExeCtx, U> {
  innerExeCtx?: ExeCtx;
  cancel?: Cancellation<ExeCtx>;
}

class ComplexTask<T, ExeArg, InnerExeCtx, U = void> extends Task<
  U,
  ComplexTaskContext<T, ExeArg, InnerExeCtx, U>,
  ComplexTaskArgument<T, ExeArg, InnerExeCtx, U>
> {
  constructor(
    private _argument: ComplexTaskArgument<T, ExeArg, InnerExeCtx, U>
  ) {
    super(complexProducer, complexContext, _argument);
  }

  map<X>(xt: (v: U) => X) {
    return new ComplexTask({
      produce: this._argument.produce,
      getContext: this._argument.getContext,
      arg: this._argument.arg,
      pipe: { through: [this._argument.pipe, xt] }
    });
  }
}

function complexProducer<T, ExeArg, InnerExeCtx, U>(
  this: ComplexTaskContext<T, ExeArg, InnerExeCtx, U>,
  consumer: Consumer<U>
): Cancellation<ComplexTaskContext<T, ExeArg, InnerExeCtx, U>> {
  this.innerExeCtx = this.getContext
    ? this.getContext(this.arg!)
    : ((undefined as any) as InnerExeCtx);
  const cancel = this.produce.call(
    this.innerExeCtx,
    new PipingConsumer<T, ExeArg, InnerExeCtx, U>(this, consumer)
  );
  if (cancel) {
    this.cancel = cancel;
  }
  return complexCancel;
}

class PipingConsumer<T, ExeArg, InnerExeCtx, U> implements Consumer<T> {
  constructor(
    private _context: ComplexTaskContext<T, ExeArg, InnerExeCtx, U>,
    private _ogConsumer: Consumer<U>
  ) {}
  resolve(value: T) {
    this._ogConsumer.resolve(simplex(this._context.pipe, value));
  }
}

function simplex<T, U>(pipe: Pipeline<T, U>, value: T): U {
  if (Array.isArray(pipe.through)) {
    const [nextPipe, xt] = pipe.through;
    return xt(simplex(nextPipe, value));
  } else {
    const xt = pipe.through;
    return xt(value);
  }
}

function complexCancel<T, ExeArg, InnerExeCtx, U>(
  this: ComplexTaskContext<T, ExeArg, InnerExeCtx, U>
) {
  if (this.cancel) {
    this.cancel.call(this.innerExeCtx!);
  }
}

function complexContext<T, ExeArg, InnerExeCtx, U>(
  c: ComplexTaskArgument<T, ExeArg, InnerExeCtx, U>
): ComplexTaskContext<T, ExeArg, InnerExeCtx, U> {
  return {
    produce: c.produce,
    getContext: c.getContext,
    arg: c.arg,
    pipe: c.pipe
  };
}

interface Pipeline<IN, OUT, X = any> {
  through: ((v: IN) => OUT) | [Pipeline<IN, X>, (v: X) => OUT];
}

// -- .bind helper class

interface FollowingTaskContext<T, U> extends FollowingTaskArgument<T, U> {
  consumer?: Consumer<U>;
  taskExecution?: Execution;
  followUpExecution?: Execution;
}
interface FollowingTaskArgument<T, U> {
  task: Task<T>;
  followUp: (value: T) => Task<U>;
}

class FollowingTask<T, U = void> extends Task<
  U,
  FollowingTaskContext<T, U>,
  FollowingTaskArgument<T, U>
> {
  constructor(_argument: FollowingTaskArgument<T, U>) {
    super(followingProducer, followingContext, _argument);
  }
}

function followingProducer<T, U>(
  this: FollowingTaskContext<T, U>,
  consumer: Consumer<U>
): Cancellation<FollowingTaskContext<T, U>> {
  this.consumer = consumer;
  this.taskExecution = this.task.run<FollowingTaskContext<T, U>>(
    followingConsume,
    this
  );
  return followingCancel;
}

function followingConsume<T, U>(this: FollowingTaskContext<T, U>, value: T) {
  this.followUpExecution = this.followUp(value).run<FollowingTaskContext<T, U>>(
    followingConsume2,
    this
  );
}

function followingConsume2<T, U>(this: FollowingTaskContext<T, U>, value: U) {
  this.consumer!.resolve(value);
}

function followingCancel<T, U>(this: FollowingTaskContext<T, U>) {
  if (this.taskExecution && !this.taskExecution.closed) {
    this.taskExecution.cancel();
  }

  if (this.followUpExecution && !this.followUpExecution.closed) {
    this.followUpExecution.cancel();
  }
}

function followingContext<T, U>(
  c: FollowingTaskArgument<T, U>
): FollowingTaskContext<T, U> {
  return c;
}

// ::all helper class

interface JoinedTaskConsumeSingleContext<T extends any[]> {
  i: number;
  context: JoinedTaskContext<T>;
}

interface JoinedTaskContext<T extends any[]> {
  consumer?: Consumer<T>;
  oks: boolean[];
  result: T;
  executions: Execution[];
  tasks: { [id in keyof T]: Task<T[id]> };
}

type JoinedTaskArgument<T extends any[]> = { [id in keyof T]: Task<T[id]> };

class JoinedTask<T extends any[]> extends Task<
  T,
  JoinedTaskContext<T>,
  JoinedTaskArgument<T>
> {
  constructor(argument: JoinedTaskArgument<T>) {
    super(joinedTaskProducer, joinedTaskContext, argument);
  }
}

function joinedTaskContext<T extends any[]>(
  arg: JoinedTaskArgument<T>
): JoinedTaskContext<T> {
  return {
    oks: arg.map(() => false),
    result: (new Array(arg.length) as any) as T,
    executions: [],
    tasks: arg
  };
}

function joinedTaskProducer<T extends any[]>(
  this: JoinedTaskContext<T>,
  consumer: Consumer<T>
) {
  this.consumer = consumer;
  for (let i = 0, l = this.tasks.length; i < l; i++) {
    this.executions.push(
      this.tasks[i].run<JoinedTaskConsumeSingleContext<T>>(
        joinedTaskConsumeSingle,
        { i, context: this }
      )
    );
  }
  return joinedTaskCancel;
}

function joinedTaskConsumeSingle<T extends any[], id extends keyof T>(
  this: JoinedTaskConsumeSingleContext<T>,
  value: T[id]
) {
  if (!this.context.oks[this.i]) {
    this.context.oks[this.i] = true;
    this.context.result[this.i] = value;

    for (let i = 0, l = this.context.oks.length; i < l; i++) {
      if (!this.context.oks[i]) {
        return;
      }
    }

    this.context.consumer!.resolve(this.context.result.slice(0) as T);
  }
}

function joinedTaskCancel<T extends any[]>(this: JoinedTaskContext<T>) {
  for (let i = 0, l = this.executions.length; i < l; i++) {
    if (!this.executions[i].closed) {
      this.executions[i].cancel();
    }
  }
}

// helpers

function singleToArray<T extends any[]>(item: T[0]): T {
  return [item] as T;
}

/**
 * A function that creates a function that gets a function as an argument
 *
 * `task` function should be provided with *producer* function
 * that then should be run with *consumer* function as its argument.
 *
 * *Producer* is a function that gets a *consumer* function
 * and returns *cancelling* function.
 * *Consumer* function gets a value that *producer* submitted
 * and is called only once, despite how many times *producer* submits. It should return nothing.
 * *Cancelling* a task neutralizes *consumer* function provided to *producer*
 * but mentioned *cancelling* function
 * should cancel all jobs tied or leading to it being called.
 *
 * *Producer* function is called
 * every time a *consumer* callback is registered.
 *
 * Example:
 *
 * // create a task
 * const soonToBeTwo = task(resolve => {
 *   const token = setTimeout(() => { resolve(2) });
 *   return () => { clearTimeout(token); }
 * });
 *
 * // run a job specified in the task and subscribe for result
 * const cancel = soonToBeTwo(n => {
 *   console.log('number:' n);
 * });
 *
 * // cancel the job
 * cancel();
 */
