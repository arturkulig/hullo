import {
  Subscription,
  Observable,
  Observer,
  ComplexProducer,
  Cancellation
} from "../Observable";

export function groupingBuffer<T>(
  queueMinLength: number,
  queueMaxLength = queueMinLength
) {
  return function groupingBufferI(source: Observable<T>) {
    return new Observable<T[]>(
      new GroupingBufferProducer<T>(source, queueMinLength, queueMaxLength)
    );
  };
}

class GroupingBufferProducer<T> implements ComplexProducer<T[]> {
  constructor(
    private source: Observable<T>,
    private queueMinLength: number,
    private queueMaxLength: number
  ) {}

  subscribe(observer: Observer<T[]>) {
    return new GroupingBufferCancellation(
      this.source.subscribe(
        new GroupingBufferObserver<T>(
          observer,
          this.queueMinLength,
          this.queueMaxLength
        )
      )
    );
  }
}

enum GroupingBufferObserverState {
  "fill",
  "sending",
  "complete"
}

class GroupingBufferObserver<T> implements Observer<T> {
  get closed() {
    return (
      this.state === GroupingBufferObserverState.complete || this.target.closed
    );
  }
  state: GroupingBufferObserverState = GroupingBufferObserverState.fill;
  buffer = new Array<T>();
  acks = new Array<() => any>();

  constructor(
    private target: Observer<T[]>,
    private queueMinLength: number,
    private queueMaxLength: number
  ) {}

  next(value: T) {
    if (this.closed) {
      return Promise.resolve();
    }

    this.buffer.push(value);

    if (this.state === GroupingBufferObserverState.sending) {
      return new Promise(resolve => {
        this.acks.push(resolve);
      });
    }

    if (this.buffer.length >= this.queueMinLength) {
      if (this.buffer.length < this.queueMaxLength) {
        setTimeout(() => this.push());
        return Promise.resolve();
      } else {
        return this.push();
      }
    }

    return Promise.resolve();
  }

  async complete() {
    if (this.closed) {
      return;
    }
    await this.push();
    this.state = GroupingBufferObserverState.complete;
    await this.target.complete();
  }

  async push() {
    switch (this.state) {
      case GroupingBufferObserverState.sending:
        return;
      case GroupingBufferObserverState.fill:
        this.state = GroupingBufferObserverState.sending;
        break;
    }
    while (
      this.state === GroupingBufferObserverState.sending &&
      this.buffer.length >= this.queueMinLength
    ) {
      while (
        this.state === GroupingBufferObserverState.sending &&
        this.buffer.length >= this.queueMinLength
      ) {
        await this.target.next(this.buffer.splice(0, this.queueMaxLength));
      }
      const currentAcks = this.acks;
      for (const ack of currentAcks) {
        ack();
      }
    }
    if (this.state === GroupingBufferObserverState.sending) {
      this.state = GroupingBufferObserverState.fill;
    }
  }
}

class GroupingBufferCancellation implements Cancellation {
  constructor(private sub: Subscription) {}

  cancel() {
    if (!this.sub.closed) {
      this.sub.cancel();
    }
  }
}
