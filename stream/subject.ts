import { Observable, Observer } from "./observable";
import { Cancellation } from "../future/task";
import { all } from "../future/all";

export function subject<T>(origin: Observable<T>): Observable<T> {
  const leeches = new Array<Observer<T>>();
  let cancel: null | Cancellation = null;
  return (observer: Observer<T>) => {
    leeches.push(observer);

    if (!cancel) {
      cancel = origin({
        next: value => all(leeches.map(leech => leech.next(value))),
        complete: () => all(leeches.map(leech => leech.complete()))
      });
    }

    return () => {
      leeches.splice(leeches.indexOf(observer), 1);

      if (leeches.length === 0 && cancel) {
        const c = cancel;
        cancel = null;
        c();
      }
    };
  };
}
