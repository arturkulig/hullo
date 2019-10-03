import {
  Subscription,
  Observable,
  Observer,
  ComplexProducer,
  Cancellation
} from "../Observable";

export function droppingBuffer<T>(queueMaxLength = 1) {
  return function droppingBufferI(source: Observable<T>) {
    return new Observable<T>(
      new DroppingBufferProducer<T>(source, queueMaxLength)
    );
  };
}

class DroppingBufferProducer<T> implements ComplexProducer<T> {
  constructor(private source: Observable<T>, private queueMaxLength: number) {}

  subscribe(observer: Observer<T>) {
    return new DroppingBufferCancellation(
      this.source.subscribe(
        new DroppingBufferObserver<T>(observer, this.queueMaxLength)
      )
    );
  }
}

class DroppingBufferObserver<T> implements Observer<T> {
  sourceCompleted = false;
  get closed() {
    return this.sourceCompleted || this.target.closed;
  }
  pushing = false;
  queue = new Array<T>();

  constructor(private target: Observer<T>, private queueMaxLength: number) {}

  async next(value: T) {
    if (!this.closed) {
      if (this.queue.length >= this.queueMaxLength) {
        this.queue.shift();
      }
      this.queue.push(value);

      this.push();
    }
  }

  async complete() {
    if (!this.closed) {
      this.sourceCompleted = true;
      if (!this.pushing) {
        this.target.complete();
      }
    }
  }

  push() {
    if (this.pushing || this.target.closed) {
      return;
    }
    const value = this.queue.shift()!;
    this.pushing = true;
    this.target.next(value).then(() => {
      this.pushing = false;

      if (this.queue.length) {
        this.push();
      } else if (this.sourceCompleted) {
        this.target.complete();
      }
    });
  }
}

class DroppingBufferCancellation implements Cancellation {
  constructor(private sub: Subscription) {}

  cancel() {
    if (!this.sub.closed) {
      this.sub.cancel();
    }
  }
}
