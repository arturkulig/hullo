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
  ctx.token = setTimeout(
    (ctx: IntervalContext) => {
      ctx.observer!.next(Date.now()).then(() => {
        intervalTrigger(ctx);
      });
    },
    ctx.time,
    ctx
  );
}

function intervalCancel(this: IntervalContext) {
  if (this.token) {
    clearTimeout(this.token);
  }
}
