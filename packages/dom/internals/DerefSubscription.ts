import { Subscription } from "@hullo/core/observable";
import { DOMElement } from "../element";

export class DerefSubscription implements Subscription {
  closed = false;

  constructor(private shape: DOMElement, private element: HTMLElement) {}

  cancel() {
    if (!this.closed) {
      this.closed = true;
      this.shape.deref!(this.element);
    }
  }
}
