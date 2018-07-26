import { subscribe, Subscription } from "../core/streams/subscribe";
import { observable } from "../core/streams/observable";
import { AsyncObserver } from "../core/streams/observableTypes";

export function subject<T>(origin: AsyncIterable<T>) {
  const innerObservers: Array<AsyncObserver<T>> = [];
  let originLive = false;
  let sub: Subscription | null = null;

  return observable<T>(observer => {
    innerObservers.push(observer);

    if (!originLive) {
      sub = subscribe(origin, {
        async next(value: T) {
          await Promise.all(
            innerObservers.map(observer => observer.next(value))
          );
        },
        async error(error: any) {
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
  });
}
