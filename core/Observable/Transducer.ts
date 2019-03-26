import { IObserver } from ".";

export interface Transducer<T, U, XdCtx> extends IObserver<T, XdCtx> {
  start(successive: IObserver<U>): XdCtx;
  cancel?(this: XdCtx): void;
}
