import { Duplex } from "./duplex";
import { Observer } from "./observable";
import { resolved } from "../task";
import { hot } from "./hot";
import { buffer } from "./buffer";

export interface Channel<T> extends Duplex<T, T> {}

export function channel<T = unknown>() {
  let remoteObserver: null | Observer<T> = null;

  return Object.assign(
    hot(
      buffer(function watchAtomValues(observer) {
        remoteObserver = observer;

        return () => {
          remoteObserver = null;
        };
      })
    ),
    {
      next: channel_next,
      complete: channel_complete
    }
  );

  function channel_next(value: T) {
    return remoteObserver ? remoteObserver.next(value) : resolved;
  }

  function channel_complete() {
    return remoteObserver ? remoteObserver.complete() : resolved;
  }
}
