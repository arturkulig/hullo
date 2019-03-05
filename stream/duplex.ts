import { Observable, Observer } from "./observable";

export interface Duplex<IN, OUT> extends Observer<IN>, Observable<OUT> {}

export const duplex = <IN, OUT>(
  i: Observer<IN>,
  o: Observable<OUT>
): Duplex<IN, OUT> =>
  Object.assign((observer: Observer<OUT>) => o(observer), i);
