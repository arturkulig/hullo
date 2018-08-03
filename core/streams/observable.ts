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
const ITERATOR_COMPLETION: IteratorResult<any> = {
  done: true,
  value: undefined
};

export function observable<T>(producer: AsyncProducer<T>): AsyncIterable<T> {
  return {
    [Symbol.asyncIterator]() {
      return createIterator<T>(producer);
    }
  };
}

type State<T> =
  | Initial
  | IncomingValue<T>
  | IncomingCompletion
  | IncomingError
  | AwaitingConsumer<T>
  | Closed;

function createIterator<T>(producer: AsyncProducer<T>): AsyncIterator<T> {
  let state: State<T> = INITIAL;

  const observer: AsyncObserver<T> = {
    get closed() {
      return state.type === "closed";
    },
    next(value: T) {
      return new Promise<void>((confirm, reject) =>
        pushIncomingMessage("incoming:value", confirm, reject, value, undefined)
      );
    },
    error(error) {
      return new Promise<void>((confirm, reject) =>
        pushIncomingMessage("incoming:error", confirm, reject, undefined, error)
      );
    },
    complete() {
      return new Promise<void>((confirm, reject) =>
        pushIncomingMessage(
          "incoming:completion",
          confirm,
          reject,
          undefined,
          undefined
        )
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
          consumeMessage(
            pendingResult.type,
            pendingResult.confirm,
            pendingResult.value,
            undefined,
            resolve,
            reject
          );
        });

      case "incoming:error":
        const pendingError = state;
        return new Promise<IteratorResult<T>>((resolve, reject) => {
          consumeMessage(
            pendingError.type,
            pendingError.confirm,
            undefined,
            pendingError.error,
            resolve,
            reject
          );
        });

      case "incoming:completion":
        const pendingCompletion = state;
        return new Promise<IteratorResult<T>>((resolve, reject) => {
          consumeMessage(
            pendingCompletion.type,
            pendingCompletion.confirm,
            undefined,
            undefined,
            resolve,
            reject
          );
        });

      case "consumer":
        return Promise.reject(new AlreadyAwaiting());

      case "closed":
        return Promise.resolve(ITERATOR_COMPLETION);

      default:
        return Promise.reject(new ImpossibleState<T>(state));
    }
  }

  function handleCompletionRequest() {
    if (state.type === "incoming:value" || state.type === "incoming:error") {
      state.reject();
    }
    if (cancellation) {
      cancellation();
    }
    return Promise.resolve(ITERATOR_COMPLETION);
  }

  function pushIncomingMessage(
    messageType: (
      | IncomingValue<T>
      | IncomingCompletion
      | IncomingError)["type"],
    messageConfirm: (
      | IncomingValue<T>
      | IncomingCompletion
      | IncomingError)["confirm"],
    messageReject: (
      | IncomingValue<T>
      | IncomingCompletion
      | IncomingError)["reject"],
    messageValue: (IncomingValue<T>)["value"] | undefined,
    messageError: (IncomingError)["error"] | undefined
  ) {
    switch (state.type) {
      case "initial":
        state = {
          type: messageType,
          confirm: messageConfirm,
          reject: messageReject,
          value: messageValue,
          error: messageError
        } as any;
        break;
      case "consumer":
        consumeMessage(
          messageType,
          messageConfirm,
          messageValue,
          undefined,
          state.feed,
          state.interrupt
        );
        break;
      case "incoming:value":
      case "incoming:error":
        messageReject(new MessageInQueue());
        return;
      case "closed":
        messageConfirm();
        return;
    }
  }

  function consumeMessage(
    messageType: (
      | IncomingValue<T>
      | IncomingCompletion
      | IncomingError)["type"],
    messageConfirm: (
      | IncomingValue<T>
      | IncomingCompletion
      | IncomingError)["confirm"],
    messageValue: (IncomingValue<T>)["value"] | undefined,
    messageError: (IncomingError)["error"] | undefined,
    consumerFeed: AwaitingConsumer<T>["feed"],
    consumerInterrupt: AwaitingConsumer<T>["interrupt"]
  ) {
    switch (messageType) {
      case "incoming:value":
        state = INITIAL;
        if (messageValue == null) {
          throw new Error();
        }
        consumerFeed({ done: false, value: messageValue });
        messageConfirm();
        break;

      case "incoming:completion":
        state = CLOSED;
        consumerFeed(ITERATOR_COMPLETION);
        messageConfirm();
        break;

      case "incoming:error":
        state = CLOSED;
        if (messageError == null) {
          throw new Error();
        }
        consumerInterrupt(messageError);
        messageConfirm();
        break;
    }
  }
}

abstract class Exception {
  abstract message: string;

  get [Symbol.toStringTag]() {
    return `Exception: ${this.message}`;
  }
}

export class MessageInQueue extends Exception {
  message = "Previous message not received yet";
}

export class AlreadyAwaiting extends Exception {
  message = "Already awaiting for next iterator result";
}

export class ImpossibleState<T> extends Exception {
  constructor(private state: State<T>) {
    super();
  }
  get message() {
    return `Impossible state of ${this.state.type}`;
  }
}
