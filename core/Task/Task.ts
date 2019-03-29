import { queue, run, FC } from "./schedule";

// Task
export interface Consumer<T> {
  resolve(value: T): void;
}

interface Producer<T, ExeCtx> {
  (this: ExeCtx, consumer: Consumer<T>): any;
}

const STAGE_NOT_DONE = { done: false as false };

interface Resolution<T> {
  stage: { done: true; value: T } | { done: false };
  interest?: FC<T, any>[] | undefined;
}

export class Task<T = any, ExeCtx = any> {
  public static resolve(): Task<void>;
  public static resolve<U>(value: U): Task<U>;
  public static resolve<U>(value?: U): Task<U> {
    return new ValueTask<U>(value!);
  }

  private static _resolved: Task<void> | undefined;
  public static get resolved() {
    return Task._resolved ? Task._resolved : (Task._resolved = Task.resolve());
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

  get done() {
    return this._res.stage.done;
  }

  _res: Resolution<T>;

  constructor(produce: Producer<T, ExeCtx>, ctx: ExeCtx);
  constructor(produce: Producer<T, any>);
  constructor();
  constructor(produce?: Producer<T, ExeCtx>, ctx?: ExeCtx) {
    this._res = {
      stage: STAGE_NOT_DONE
    };
    if (produce) {
      if (ctx !== undefined) {
        produce.call(ctx, new TaskConsumer(this._res));
      } else {
        ((produce as unknown) as Producer<T, void>)(
          new TaskConsumer(this._res)
        );
      }
    }
  }

  unwrap(): T {
    if (!this._res.stage.done) {
      throw new Error("Cannot unwrap from Task not done yet");
    }
    return this._res.stage.value;
  }

  run<ConsumeCtx>(
    consume: (this: ConsumeCtx, value: T) => void,
    ctx?: ConsumeCtx
  ) {
    if (this._res.stage.done) {
      consume.call(ctx as ConsumeCtx, this._res.stage.value);
    } else if (!this._res.interest) {
      this._res.interest = [
        {
          f: consume,
          c: ctx
        }
      ];
    } else {
      this._res.interest.push({
        f: consume,
        c: ctx
      });
    }
  }

  map<U>(xf: (v: T) => U): Task<U> {
    return this._res.stage.done
      ? new ValueTask(xf(this._res.stage.value))
      : new ComplexTask({ task: this, xf });
  }

  bind<U>(xf: (value: T) => Task<U>): Task<U> {
    return this._res.stage.done
      ? xf(this._res.stage.value)
      : new FollowingTask<T, U>({ task: this, followUp: xf });
  }
}

class TaskConsumer<T> implements Consumer<T> {
  constructor(private _res: Resolution<T>) {}

  resolve(value: T) {
    if (this._res.stage.done) {
      return;
    }
    this._res.stage = { done: true, value };
    queue.push({
      v: value,
      fcs: this._res.interest
    });
    run();
  }
}

// .resolve helper

class ValueTask<T> extends Task<T, T> {
  constructor(value: T) {
    super();
    const res = this._res;
    res.stage = { done: true, value };
    if (res.interest) {
      for (let i = 0, l = res.interest.length; i < l; i += 1) {
        res.interest[i].f.call(res.interest[i].c, value);
      }
    }
  }
}

// -- .map helper class

interface ComplexTaskContext<T, U> {
  task: Task<T>;
  xf: (value: T) => U;
}

class ComplexTask<T, U = void> extends Task<U, ComplexTaskContext<T, U>> {
  constructor(context: ComplexTaskContext<T, U>) {
    super(complexProducer, context);
  }
}

function complexProducer<T, U>(
  this: ComplexTaskContext<T, U>,
  consumer: Consumer<U>
) {
  const complexConsumeContext = { consumer, context: this };
  this.task.run<typeof complexConsumeContext>(complexConsume, {
    consumer,
    context: this
  });
}

function complexConsume<T, U>(
  this: { consumer: Consumer<U>; context: ComplexTaskContext<T, U> },
  value: T
) {
  this.consumer.resolve(this.context.xf(value));
}

// -- .bind helper class

interface FollowingTaskContext<T, U> {
  task: Task<T>;
  followUp: (value: T) => Task<U>;
  consumer?: Consumer<U>;
}

interface FollowingTaskArgument<T, U> {
  task: Task<T>;
  followUp: (value: T) => Task<U>;
}

class FollowingTask<T, U = void> extends Task<U, FollowingTaskContext<T, U>> {
  constructor(argument: FollowingTaskArgument<T, U>) {
    super(followingProducer, argument);
  }
}

function followingProducer<T, U>(
  this: FollowingTaskContext<T, U>,
  consumer: Consumer<U>
) {
  this.consumer = consumer;
  this.task.run<FollowingTaskContext<T, U>>(followingConsume, this);
}

function followingConsume<T, U>(this: FollowingTaskContext<T, U>, value: T) {
  this.followUp(value).run<FollowingTaskContext<T, U>>(followingConsume2, this);
}

function followingConsume2<T, U>(this: FollowingTaskContext<T, U>, value: U) {
  this.consumer!.resolve(value);
}

// ::all helper class

interface JoinedTaskContext<T extends any[]> {
  consumer?: Consumer<T>;
  oksLeft: number;
  oks: boolean[];
  result: T;
  tasks: { [id in keyof T]: Task<T[id]> };
}

type JoinedTaskArgument<T extends any[]> = { [id in keyof T]: Task<T[id]> };

class JoinedTask<T extends any[]> extends Task<T, JoinedTaskContext<T>> {
  constructor(arg: JoinedTaskArgument<T>) {
    super(joinedTaskProducer, {
      oksLeft: arg.length,
      oks: new Array(arg.length),
      result: (new Array(arg.length) as any) as T,
      tasks: arg
    });
  }
}

function joinedTaskProducer<T extends any[]>(
  this: JoinedTaskContext<T>,
  consumer: Consumer<T>
) {
  this.consumer = consumer;
  for (let i = 0, l = this.tasks.length, task = this.tasks[i]; i < l; i++) {
    if (task.done) {
      this.oks[i] = true;
      this.oksLeft--;
      this.result[i] = task.unwrap();
    } else {
      const ctx = {
        i,
        context: this
      };
      task.run<typeof ctx>(joinedTaskConsumeSingle, ctx);
    }
  }
  if (this.oksLeft === 0) {
    this.consumer!.resolve(this.result);
  }
}

function joinedTaskConsumeSingle<T extends any[], id extends keyof T>(
  this: { i: number; context: JoinedTaskContext<T> },
  value: T[id]
) {
  if (!this.context.oks[this.i]) {
    this.context.oks[this.i] = true;
    this.context.result[this.i] = value;
    this.context.oksLeft--;

    if (this.context.oksLeft === 0) {
      this.context.consumer!.resolve(this.context.result);
    }
  }
}

// helpers

function singleToArray<T extends any[]>(item: T[0]): T {
  return [item] as T;
}
