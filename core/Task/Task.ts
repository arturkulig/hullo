import { Play, queue, run, Done } from "./schedule";

// Task
export interface Consumer<T> {
  resolve(value: T): void;
}

interface Producer<T, ExeCtx> {
  (this: ExeCtx, consumer: Consumer<T>): any;
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
    return this._play.done;
  }

  _play: Play<T, ExeCtx>;

  constructor(produce: Producer<T, ExeCtx>, ctx: ExeCtx);
  constructor(produce: Producer<T, any>);
  constructor();
  constructor(produce?: Producer<T, ExeCtx>, ctx?: ExeCtx) {
    this._play = {
      done: false
    };
    if (produce) {
      if (ctx !== undefined) {
        produce.call(ctx, new TaskConsumer(this._play));
      } else {
        ((produce as unknown) as Producer<T, void>)(
          new TaskConsumer(this._play)
        );
      }
    }
  }

  unwrap(): T {
    if (!this._play.done) {
      throw new Error("Cannot unwrap from Task not done yet");
    }
    return this._play.result;
  }

  run<ConsumeCtx>(
    consume: (this: ConsumeCtx, value: T) => void,
    consumeContext?: ConsumeCtx
  ) {
    if (this._play.done) {
      consume.call(consumeContext as ConsumeCtx, this._play.result);
    } else if (!this._play.interests) {
      this._play.interests = [
        {
          consume,
          consumeContext
        }
      ];
    } else {
      this._play.interests.push({
        consume,
        consumeContext
      });
    }
  }

  map<U>(xt: (value: T) => U): Task<U> {
    return new ComplexTask({
      task: this,
      followUp: xt
    });
  }

  bind<U>(xt: (value: T) => Task<U>): Task<U> {
    return new FollowingTask<T, U>({ task: this, followUp: xt });
  }
}

class TaskConsumer<T> implements Consumer<T> {
  constructor(private _play: Play<T, any>) {}

  resolve(value: T) {
    if (!this._play.done) {
      const play = (this._play as unknown) as Done<T>;
      play.done = true;
      play.result = value;
      queue.push(play);
      run();
    }
  }
}

// .resolve helper

class ValueTask<T> extends Task<T, T> {
  constructor(value: T) {
    super();
    const play = (this._play as unknown) as Done<T>;
    play.done = true;
    play.result = value;
    if (play.interests) {
      for (let i = 0, l = play.interests.length; i < l; i += 1) {
        play.interests[i].consume.call(play.interests[i].consumeContext, value);
      }
    }
  }
}

// -- .map helper class

interface ComplexTaskContext<T, U> {
  task: Task<T>;
  followUp: (value: T) => U;
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
  this.consumer.resolve(this.context.followUp(value));
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

interface JoinedTaskConsumeSingleContext<T extends any[]> {
  i: number;
  context: JoinedTaskContext<T>;
}

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
  for (let i = 0, l = this.tasks.length; i < l; i++) {
    this.tasks[i].run<JoinedTaskConsumeSingleContext<T>>(
      joinedTaskConsumeSingle,
      { i, context: this }
    );
  }
}

function joinedTaskConsumeSingle<T extends any[], id extends keyof T>(
  this: JoinedTaskConsumeSingleContext<T>,
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
