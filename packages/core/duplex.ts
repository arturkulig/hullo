import { Observer, Observable } from "./observable";

const duplexSymbol = Symbol("is Duplex");

export class Duplex<IN, OUT> extends Observable<OUT> implements Observer<IN> {
  [duplexSymbol] = true;

  constructor(
    private observable: Observable<OUT>,
    private observer: Observer<IN>
  ) {
    super(Duplex.prototype.duplexProduce);
  }

  private duplexProduce(observer: Observer<OUT>) {
    return this.observable.subscribe(observer);
  }

  get closed() {
    return this.observer.closed;
  }

  next(value: IN) {
    return this.observer.next(value);
  }

  complete() {
    return this.observer.complete();
  }
}
