import { AsyncProducer, AsyncObserver } from "./observableTypes";

export function queue<T>(producer: AsyncProducer<T>) {
  return (innerObserver: AsyncObserver<T>) => {
    let previousMessageReceived = Promise.resolve();

    const outerObserver: AsyncObserver<T> = {
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
      error(error: any) {
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
