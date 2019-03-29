import { SkippingObserver } from "./Observable";

export interface Transducer<T, U, Context>
  extends SkippingObserver<T, Context> {
  start(successive: SkippingObserver<U, Context>): Context;
  cancel?(this: Context): void;
}
