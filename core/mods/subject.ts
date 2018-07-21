import { subscribe, Subscription } from "../utils";
import { queue } from "../mods";
import { observable } from "../streams";
import { AsyncObserver } from "../streams";

export function subject<T, ERR = Error>(origin: AsyncIterable<T>) {
  const innerObservers: Array<AsyncObserver<T, ERR>> = [];
  let originLive = false;
  let sub: Subscription | null = null;

  return observable<T, ERR>(
    queue(observer => {
      innerObservers.push(observer);

      if (!originLive) {
        sub = subscribe(origin, {
          async next(value: T) {
            await Promise.all(
              innerObservers.map(observer => observer.next(value))
            );
          },
          async error(error: ERR) {
            originLive = false;
            await Promise.all(
              innerObservers.splice(0).map(observer => observer.error(error))
            );
          },
          async complete() {
            originLive = false;
            await Promise.all(
              innerObservers.splice(0).map(observer => observer.complete())
            );
          }
        });
        originLive = true;
      }

      return () => {
        innerObservers.splice(innerObservers.indexOf(observer), 1);
        if (innerObservers.length === 0) {
          originLive = false;
          if (sub && !sub.closed) {
            sub.unsubscribe();
          }
        }
      };
    })
  );
}
