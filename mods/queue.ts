import { AsyncProducer, AsyncObserver } from "../core/observableTypes";

export function queue<T, ERR = Error>(producer: AsyncProducer<T, ERR>) {
  return (innerObserver: AsyncObserver<T, ERR>) => {
    let previousMessageReceived = Promise.resolve();

    const outerObserver: AsyncObserver<T, ERR> = {
      get closed() {
        return innerObserver.closed;
      },
      next(value: T) {
        return new Promise((confirm, reject) => {
          previousMessageReceived = previousMessageReceived.then(() =>
            innerObserver.next(value).then(confirm, reject)
          );
        });
      },
      error(error: ERR) {
        return new Promise((confirm, reject) => {
          previousMessageReceived = previousMessageReceived.then(() =>
            innerObserver.error(error).then(confirm, reject)
          );
        });
      },
      complete() {
        return new Promise((confirm, reject) => {
          previousMessageReceived = previousMessageReceived.then(() =>
            innerObserver.complete().then(confirm, reject)
          );
        });
      }
    };

    return producer(outerObserver);
  };
}
