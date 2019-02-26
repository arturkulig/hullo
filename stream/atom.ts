import { duplex, Duplex } from "./duplex";
import { observable, Observer } from "./observable";
import { buffer } from "./buffer";
import { subject } from "./subject";
import { resolved } from "../future";

export interface Atom<T = unknown> extends Duplex<T, T> {}

export function atom<T = unknown>(init: T) {
  let remoteObserver: null | Observer<T> = null;
  let state = init;

  return Object.assign(
    duplex<T, T>(
      {
        next: function atomNext(value) {
          state = value;
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
            observer.next(state);

            return () => {
              remoteObserver = null;
            };
          })
        )
      )
    ),
    {
      valueOf: () => state
    }
  );
}
