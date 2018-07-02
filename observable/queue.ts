import { AsyncProducer, AsyncObserver } from "../observable/observableTypes";

export function queue<T, ERR = Error>(producer: AsyncProducer<T, ERR>) {
  return (innerObserver: AsyncObserver<T, ERR>) => {
    let previousMessageReceived = Promise.resolve();

    const outerObserver: AsyncObserver<T, ERR> = {
      get closed() {
        return innerObserver.closed;
      },
      next(value: T) {
        return new Promise((confirm, infirm) => {
          previousMessageReceived = previousMessageReceived.then(() =>
            innerObserver.next(value).then(confirm, infirm)
          );
        });
      },
      error(error: ERR) {
        return new Promise((confirm, infirm) => {
          previousMessageReceived = previousMessageReceived.then(() =>
            innerObserver.error(error).then(confirm, infirm)
          );
        });
      },
      complete() {
        return new Promise((confirm, infirm) => {
          previousMessageReceived = previousMessageReceived.then(() =>
            innerObserver.complete().then(confirm, infirm)
          );
        });
      }
    };

    return producer(outerObserver);
  };
}
