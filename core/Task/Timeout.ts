import { Task, Consumer } from "./Task";

interface TimeoutContext {
  time: number;
  token?: any;
}

export class Timeout extends Task<number, TimeoutContext> {
  constructor(time: number) {
    super(timeoutProducer, { time });
  }
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
