import { pipe } from "../pipe";
import { resolved, then2, commit } from "../task";
import { Observable, Observer } from "./observable";

export function ofOne<T>(v: T): Observable<T> {
  return function ofOne_observable(observer: Observer<T>) {
    return pipe(
      resolved,
      then2(() => observer.next(v)),
      then2(observer.complete),
      commit
    );
  };
}
