import { subscribe } from "../utils/subscribe";
import { queue } from "../mods/queue";
import { AsyncObserver } from "../core/observableTypes";
import { observable } from "../core/observable";

export function hot<T, ERR = Error>(origin: AsyncIterable<T>) {
  let subsCount = 0;
  const innerObservers: Array<
    (observer: AsyncObserver<T, ERR>) => Promise<void>
  > = [];
  let firstObserver: AsyncObserver<T, ERR> | null = null;

  let prewarmSub = subscribeOrigin();

  return observable<T, ERR>(
    queue(observer => {
      if (subsCount > 0) {
        subsCount++;
        const regularSub = subscribe<T, ERR>(origin, observer);
        return () => {
          subsCount--;
          if (subsCount === 0) {
            prewarmSub = subscribeOrigin();
          }
          return regularSub.unsubscribe();
        };
      }

      subsCount++;
      for (const sender of innerObservers) {
        sender(observer);
      }
      firstObserver = observer;

      return () => {
        subsCount--;
        if (subsCount === 0) {
          prewarmSub = subscribeOrigin();
        }
        return prewarmSub.unsubscribe();
      };
    })
  );

  function subscribeOrigin() {
    return subscribe(origin, {
      get closed() {
        if (firstObserver) {
          return firstObserver.closed;
        }
        return false;
      },
      next(value: T) {
        if (firstObserver) {
          return firstObserver.next(value);
        }
        return new Promise<void>((confirm, reject) => {
          innerObservers.push((observer: AsyncObserver<T, ERR>) =>
            observer.next(value).then(confirm, reject)
          );
        });
      },
      error(error: ERR) {
        if (firstObserver) {
          return firstObserver.error(error);
        }
        return new Promise<void>((confirm, reject) => {
          innerObservers.push((observer: AsyncObserver<T, ERR>) =>
            observer.error(error).then(confirm, reject)
          );
        });
      },
      complete() {
        if (firstObserver) {
          return firstObserver.complete();
        }
        return new Promise<void>((confirm, reject) => {
          innerObservers.push((observer: AsyncObserver<T, ERR>) =>
            observer.complete().then(confirm, reject)
          );
        });
      }
    });
  }
}
