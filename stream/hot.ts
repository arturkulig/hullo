import { resolved } from "../task";
import { Observable, Observer } from "./observable";
import { subject } from "./subject";

export function hot<T>(source: Observable<T>): Observable<T> {
  let remoteObserver: Observer<T> | null = null;
  source({
    next: function hot_next(v: T) {
      return remoteObserver ? remoteObserver.next(v) : resolved;
    },
    complete: function hot_complete() {
      return remoteObserver ? remoteObserver.complete() : resolved;
    }
  });
  return subject(function hotI(observer: Observer<T>) {
    remoteObserver = observer;
    return function hotI_cancel() {
      remoteObserver = null;
    };
  });
}
