import {
  AsyncObserver,
  Cancellation,
  AsyncProducer,
  Initial,
  IncomingValue,
  IncomingError,
  AwaitingConsumer,
  Closed,
  IncomingCompletion
} from "./observableTypes";

const INITIAL: Initial = { type: "initial" };

const CLOSED: Closed = { type: "closed" };

export function observable<T, ERR = Error>(
  producer: AsyncProducer<T, ERR>
): AsyncIterable<T> {
  let running = false;
  return {
    [Symbol.asyncIterator]() {
      if (running) {
        console.warn(`observable already running ${producer.name}(observer)`);
      }
      running = true;
      return createIterator<T, ERR>(producer);
    }
  };
}

type State<T, ERR> =
  | Initial
  | IncomingValue<T>
  | IncomingCompletion
  | IncomingError<ERR>
  | AwaitingConsumer<T, ERR>
  | Closed;

function createIterator<T, ERR>(
  producer: AsyncProducer<T, ERR>
): AsyncIterator<T> {
  let state: State<T, ERR> = INITIAL;

  const observer: AsyncObserver<T, ERR> = {
    get closed() {
      return false;
    },
    next(value: T) {
      return new Promise<void>((confirm, reject) =>
        pushIncomingMessage({
          type: "incoming:value",
          value,
          confirm,
          reject
        })
      );
    },
    error(error: ERR) {
      return new Promise<void>((confirm, reject) =>
        pushIncomingMessage({
          type: "incoming:error",
          error,
          confirm,
          reject
        })
      );
    },
    complete() {
      return new Promise<void>((confirm, reject) =>
        pushIncomingMessage({
          type: "incoming:completion",
          confirm,
          reject
        })
      );
    }
  };

  const cancellation: Cancellation = producer(observer);

  return {
    next() {
      return handleValueRequest();
    },
    throw() {
      return handleCompletionRequest();
    },
    return() {
      return handleCompletionRequest();
    }
  };

  function handleValueRequest() {
    switch (state.type) {
      case "initial":
        return new Promise<IteratorResult<T>>((resolve, reject) => {
          state = {
            type: "consumer",
            feed: resolve,
            interrupt: reject
          };
        });

      case "incoming:value":
        const pendingResult = state;
        return new Promise<IteratorResult<T>>((resolve, reject) => {
          consumeMessage(pendingResult, {
            type: "consumer",
            feed: resolve,
            interrupt: reject
          });
        });

      case "incoming:error":
        const pendingError = state;
        return new Promise<IteratorResult<T>>((resolve, reject) => {
          consumeMessage(pendingError, {
            type: "consumer",
            feed: resolve,
            interrupt: reject
          });
        });

      case "incoming:completion":
        const pendingCompletion = state;
        return new Promise<IteratorResult<T>>((resolve, reject) => {
          consumeMessage(pendingCompletion, {
            type: "consumer",
            feed: resolve,
            interrupt: reject
          });
        });

      case "consumer":
        return Promise.reject(new AlreadyAwaiting());

      case "closed":
        return Promise.reject(new IteratorClosed());

      default:
        return Promise.reject(new ImpossibleState<T, ERR>(state));
    }
  }

  function handleCompletionRequest() {
    if (state.type === "incoming:value" || state.type === "incoming:error") {
      state.reject();
    }
    if (cancellation) {
      cancellation();
    }
    return Promise.resolve({
      done: true,
      value: (undefined as any) as T
    });
  }

  function pushIncomingMessage(
    message: IncomingValue<T> | IncomingCompletion | IncomingError<ERR>
  ) {
    switch (state.type) {
      case "initial":
        state = message;
        break;
      case "consumer":
        consumeMessage(message, state);
        break;
      case "incoming:value":
      case "incoming:error":
        message.reject(new MessageInQueue());
        return;
      case "closed":
        message.reject(new IteratorClosed());
        return;
    }
  }

  function consumeMessage(
    message: IncomingValue<T> | IncomingCompletion | IncomingError<ERR>,
    consumer: AwaitingConsumer<T, ERR>
  ) {
    switch (message.type) {
      case "incoming:value":
        state = INITIAL;
        consumer.feed({ done: false, value: message.value });
        message.confirm();
        break;

      case "incoming:completion":
        state = CLOSED;
        consumer.feed({ done: true, value: (undefined as any) as T });
        message.confirm();
        break;

      case "incoming:error":
        state = CLOSED;
        consumer.interrupt(message.error);
        message.confirm();
        break;
    }
  }
}

abstract class Exception {
  abstract message: string;

  toString() {
    return this.message;
  }
}

export class MessageInQueue extends Exception {
  message = "Previous message not received yet";
}

export class AlreadyAwaiting extends Exception {
  message = "Already awaiting for next iterator result";
}

export class IteratorClosed extends Exception {
  message = "Iterator is closed has been closed";
}

export class ImpossibleState<T, ERR> extends Exception {
  constructor(private state: State<T, ERR>) {
    super();
  }
  get message() {
    return `Impossible state of ${this.state.type}`;
  }
}
