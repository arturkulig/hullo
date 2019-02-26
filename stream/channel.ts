import { duplex, Duplex } from "./duplex";
import { observable, Observer } from "./observable";
import { resolved } from "../future";
import { subject } from "./subject";
import { buffer } from "./buffer";

export interface Channel<T> extends Duplex<T, T> {}

export function channel<T = unknown>() {
  let remoteObserver: null | Observer<T> = null;

  return duplex<T, T>(
    {
      next: function atomNext(value) {
        if (remoteObserver) return remoteObserver.next(value);
        else return resolved;
      },
      complete: function atomCompletion() {
        if (remoteObserver) return remoteObserver.complete();
        else return resolved;
      }
    },
    subject(
      buffer(
        observable(function watchAtomValues(observer) {
          remoteObserver = observer;

          return () => {
            remoteObserver = null;
          };
        })
      )
    )
  );
}
