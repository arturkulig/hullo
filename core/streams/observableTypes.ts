export interface AsyncObserver<T> {
  closed: boolean;
  next(value: T): Promise<void>;
  error(error: any): Promise<void>;
  complete(): Promise<void>;
}

export interface CancellationFunction {
  (): void;
}

export type Cancellation = CancellationFunction | void;

export interface AsyncProducer<T> {
  (observer: AsyncObserver<T>): Cancellation;
}

export interface Initial {
  type: "initial";
}

interface Incoming {
  confirm: () => void;
  reject: (err?: any) => void;
}

export interface IncomingValue<T> extends Incoming {
  type: "incoming:value";
  value: T;
}

export interface IncomingCompletion extends Incoming {
  type: "incoming:completion";
}

export interface IncomingError extends Incoming {
  type: "incoming:error";
  error: any;
}

export interface AwaitingConsumer<T> {
  type: "consumer";
  feed: (value: IteratorResult<T>) => void;
  interrupt: (error: any) => void;
}

export interface Closed {
  type: "closed";
}
