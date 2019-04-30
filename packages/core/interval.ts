import {
  Observable,
  Observer,
  ComplexProducer,
  Cancellation
} from "./observable";

export function interval(time: number): Observable<number> {
  return new Observable<number>(new IntervalProducer(time));
}

class IntervalProducer implements ComplexProducer<number> {
  constructor(private time: number) {}

  subscribe(observer: Observer<number>) {
    const context: IntervalContext = {
      observer,
      token: null,
      schedule: () => {
        context.token = setTimeout(intervalCallback, this.time, context);
      }
    };
    context.schedule();

    return new IntervalCancel(context);
  }
}

function intervalCallback(context: IntervalContext) {
  context.observer.next(Date.now()).then(context.schedule);
}

class IntervalCancel implements Cancellation {
  constructor(private context: IntervalContext) {}

  cancel() {
    if (this.context.token) {
      clearTimeout(this.context.token);
    }
  }
}

interface IntervalContext {
  observer: Observer<number>;
  token: any;
  schedule: () => any;
}
