import { AsyncObserver } from "../streams";

export interface Subscription {
  closed: boolean;
  unsubscribe(): void;
}

type Subscriber<T, ERR> = {
  [id in keyof AsyncObserver<T, ERR>]?: AsyncObserver<
    T,
    ERR
  >[id] extends () => Promise<void>
    ? (() => Promise<void> | void)
    : AsyncObserver<T, ERR>[id] extends (input: infer INPUT) => Promise<void>
      ? ((input: INPUT) => Promise<void> | void)
      : AsyncObserver<T, ERR>[id]
};

export function subscribe<T, ERR = Error>(
  stream: AsyncIterable<T>,
  observer: Subscriber<T, ERR>
) {
  const subscription: Subscription = {
    closed: false,
    unsubscribe: noop
  };
  iterate(stream, observer, subscription);
  return subscription;
}

function iterate<T, ERR>(
  stream: AsyncIterable<T>,
  subscriber: Subscriber<T, ERR>,
  subscription: Subscription
) {
  const iterator = stream[Symbol.asyncIterator]();
  subscription.unsubscribe = () => {
    if (!subscription.closed && iterator.return) {
      muffle(iterator.return);
    }
    closeSubscription(subscription);
  };
  executeIteration(iterator, subscriber, subscription);
}

function executeIteration<T, ERR>(
  iterator: AsyncIterator<T>,
  subscriber: Subscriber<T, ERR>,
  subscription: Subscription
) {
  try {
    iterator
      .next()
      .then(
        step =>
          handleIterationStep<T, ERR>(iterator, subscriber, subscription, step),
        error => handleIterationError(subscriber, subscription, error)
      );
  } catch (e) {
    handleIterationError(subscriber, subscription, e);
  }
}

function handleIterationStep<T, ERR>(
  iterator: AsyncIterator<T>,
  subscriber: Subscriber<T, ERR>,
  subscription: Subscription,
  { value, done }: IteratorResult<T>
) {
  if (subscription.closed) {
    return;
  }
  if (done) {
    closeSubscription(subscription);
    if (subscriber.complete) {
      return subscriber.complete();
    }
  } else if (subscriber.next) {
    return (muffle(subscriber.next, value) || Promise.resolve()).then(() =>
      executeIteration<T, ERR>(iterator, subscriber, subscription)
    );
  }
}

function handleIterationError<T, ERR>(
  subscriber: Subscriber<T, ERR>,
  subscription: Subscription,
  error: ERR
) {
  if (subscription.closed) {
    return;
  }
  closeSubscription(subscription);
  if (subscriber.error) {
    muffle(subscriber.error, error);
  }
}

function closeSubscription(subscription: Subscription) {
  Object.defineProperty(subscription, "closed", {
    value: true,
    writable: false,
    enumerable: true,
    configurable: false
  });
}

function muffle<IN>(
  p: (...input: IN[]) => Promise<any> | any,
  ...input: IN[]
): Promise<void> | void {
  try {
    const result = p(...input);
    if (typeof result === "object" && "then" in result) {
      return result.then(noop, (e: any) => {
        console.warn("muffled", e);
      });
    }
  } catch {}
}

function noop(): undefined {
  return undefined;
}
