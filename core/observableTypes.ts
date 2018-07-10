export interface AsyncObserver<T, ERR> {
  closed: boolean;
  next(value: T): Promise<void>;
  error(error: ERR): Promise<void>;
  complete(): Promise<void>;
}

export interface CancellationFunction {
  (): void;
}

export type Cancellation = CancellationFunction | void;

export interface AsyncProducer<T, ERR> {
  (observer: AsyncObserver<T, ERR>): Cancellation;
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

export interface IncomingError<ERR> extends Incoming {
  type: "incoming:error";
  error: ERR;
}

export interface AwaitingConsumer<T, ERR> {
  type: "consumer";
  feed: (value: IteratorResult<T>) => void;
  interrupt: (error: ERR) => void;
}

export interface Closed {
  type: "closed";
}