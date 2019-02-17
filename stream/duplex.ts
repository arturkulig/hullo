import { observable, Observable, Observer } from "./observable";

export interface Duplex<IN, OUT> {
  i: Observer<IN>;
  o: Observable<OUT>;
}

export const duplex = <IN, OUT>(i: Observer<IN>, o: Observable<OUT>) =>
  Object.assign(observable(o), i);
