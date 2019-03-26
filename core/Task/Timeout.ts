import { Task, Consumer } from "./Task";

interface TimeoutContext {
  time: number;
  token?: any;
}

type TimeoutArgument = number;

export class Timeout extends Task<number, TimeoutContext, TimeoutArgument> {
  constructor(n: number) {
    super(timeoutProducer, timeoutContext, n);
  }
}

function timeoutContext(arg: TimeoutArgument): TimeoutContext {
  return {
    time: arg
  };
}

function timeoutProducer(this: TimeoutContext, consumer: Consumer<number>) {
  this.token = setTimeout(
    (consumer: Consumer<number>) => {
      consumer.resolve(Date.now());
    },
    this.time,
    consumer
  );

  return timeoutCancel;
}

function timeoutCancel(this: TimeoutContext) {
  clearTimeout(this.token);
}
