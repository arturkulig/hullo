import { AsyncObserver } from "./observableTypes";
import { subscribe } from "../observable/subscribe";
import { observable } from "../observable/observable";
import { queue } from "./queue";

export function subject<T, ERR = Error>(origin: AsyncIterable<T>) {
  const innerObservers: Array<AsyncObserver<T, ERR>> = [];
  let originLive = false;

  return observable<T, ERR>(
    queue(observer => {
      innerObservers.push(observer);

      if (!originLive) {
        subscribe(origin, {
          async next(value: T) {
            await Promise.all(
              innerObservers.map(observer => observer.next(value))
            );
          },
          async error(error: ERR) {
            await Promise.all(
              innerObservers.splice(0).map(observer => observer.error(error))
            );
          },
          async complete() {
            await Promise.all(
              innerObservers.splice(0).map(observer => observer.complete())
            );
          }
        });
        originLive = true;
      }

      return () => {
        innerObservers.splice(innerObservers.indexOf(observer), 1);
      };
    })
  );
}
