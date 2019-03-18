import { Observer } from "./observable";
import { buffer } from "./buffer";
import { schedule } from "../task";

export function interval(span: number, immediate = true) {
  return buffer(function intervalI(observer: Observer<number>) {
    const cancelFirst = immediate ? observer.next(Date.now())(noop) : noop;
    const intervalToken = setInterval(() => {
      schedule(observer.next, Date.now());
    }, span);

    return function interval_cancel() {
      cancelFirst();
      clearInterval(intervalToken);
    };
  });
}

function noop() {}
