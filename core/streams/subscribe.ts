export interface Subscription {
  closed: boolean;
  unsubscribe(): void;
}

type Subscriber<T> = {
  next?(value: T): Promise<any> | any;
  error?(error: any): Promise<any> | any;
  complete?(): Promise<any> | any;
};

export function subscribe<T = Error>(
  stream: AsyncIterable<T>,
  observer: Subscriber<T>
) {
  const subscription: Subscription = {
    closed: false,
    unsubscribe: noop
  };
  iterate(stream, observer, subscription);
  return subscription;
}

function iterate<T>(
  stream: AsyncIterable<T>,
  subscriber: Subscriber<T>,
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

function executeIteration<T>(
  iterator: AsyncIterator<T>,
  subscriber: Subscriber<T>,
  subscription: Subscription
) {
  try {
    iterator
      .next()
      .then(
        step =>
          handleIterationStep<T>(iterator, subscriber, subscription, step),
        error => handleIterationError(subscriber, subscription, error)
      );
  } catch (e) {
    handleIterationError(subscriber, subscription, e);
  }
}

function handleIterationStep<T>(
  iterator: AsyncIterator<T>,
  subscriber: Subscriber<T>,
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
    const muffled = muffle(subscriber.next, value);
    return muffled
      ? muffled.then(() => {
          executeIteration<T>(iterator, subscriber, subscription);
        })
      : executeIteration<T>(iterator, subscriber, subscription);
  }
}

function handleIterationError<T>(
  subscriber: Subscriber<T>,
  subscription: Subscription,
  error: any
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
