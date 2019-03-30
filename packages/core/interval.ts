import { Observable, Observer, observable } from "./observable";

export function interval(time: number): Observable<number> {
  return observable<Number, IntervalContext, IntervalArg>(
    intervalProducer,
    intervalContext,
    time
  );
}

function intervalContext(arg: IntervalArg): IntervalContext {
  return {
    token: undefined,
    time: arg
  };
}

function intervalProducer(this: IntervalContext, observer: Observer<number>) {
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

type IntervalArg = number;

interface IntervalContext {
  observer?: Observer<number>;
  time: number;
  token: any;
}
