import { pipe } from "../pipe";
import { then2, resolved, commit } from "../task";
import { Observable, Observer } from "./observable";

export function ofMany<T>(list: T[]): Observable<T> {
  return function ofMany_observable(observer: Observer<T>) {
    return pipe(
      resolved,
      ...list.map(item => then2(() => observer.next(item))),
      then2(observer.complete),
      commit
    );
  };
}
