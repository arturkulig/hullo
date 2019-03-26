import { Observable, IObserver } from "./Observable";

type IntervalArg = number;

interface IntervalContext {
  observer?: IObserver<number>;
  time: number;
  token: any;
}

export class Interval extends Observable<number, IntervalContext, IntervalArg> {
  constructor(arg: IntervalArg) {
    super(intervalProducer, intervalContext, arg);
  }
}

function intervalContext(arg: IntervalArg): IntervalContext {
  return {
    token: undefined,
    time: arg
  };
}

function intervalProducer(this: IntervalContext, observer: IObserver<number>) {
  this.observer = observer;
  intervalTrigger(this);

  return intervalCancel;
}

function intervalTrigger(ctx: IntervalContext) {
  if (ctx.observer) {
    ctx.observer.next(Date.now()).run(intervalFollow, ctx);
  }
}

function intervalFollow(this: IntervalContext) {
  this.token = setTimeout(intervalTrigger, this.time, this);
}

function intervalCancel(this: IntervalContext) {
  if (this.token) {
    clearTimeout(this.token);
  }
}
