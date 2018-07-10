import { AsyncObserver } from "../core/observableTypes";

export interface Subscription {
  closed: boolean;
  unsubscribe(): void;
}

export function subscribe<T, ERR = Error>(
  stream: AsyncIterable<T>,
  observer: Partial<AsyncObserver<T, ERR>>
) {
  const subscription: Subscription = {
    closed: false,
    unsubscribe: noop
  };
  over(stream, observer, subscription);
  return subscription;
}

async function over<T, ERR>(
  stream: AsyncIterable<T>,
  observer: Partial<AsyncObserver<T, ERR>>,
  subscription: Subscription
) {
  const iterator = stream[Symbol.asyncIterator]();
  while (true) {
    const { cancel, result: promisedResult } = makeDroppable<IteratorResult<T>>(
      iterator.next()
    );
    subscription.unsubscribe = cancel;
    try {
      const result = await promisedResult;
      if (result.cancelled) {
        break;
      }
      const { done, value } = await result.value;
      if (done) {
        break;
      }
      if (observer.next) {
        try {
          await observer.next(value);
        } catch {}
      }
    } catch (e) {
      if (observer.error) {
        try {
          await observer.error(e);
        } catch {}
      }
    }
  }
  if (observer.complete) {
    await observer.complete();
  }
  subscription.closed = true;
}

function makeDroppable<T>(task: Promise<T>) {
  let cancel = noop;
  const result = new Promise<
    { cancelled: false; value: T } | { cancelled: true }
  >((resolve, reject) => {
    task.then(value => resolve({ cancelled: false, value }), reject);
    cancel = () => {
      resolve({ cancelled: true });
    };
  });
  return { cancel, result };
}

function noop() {}
