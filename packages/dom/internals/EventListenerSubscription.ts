import { Subscription } from "@hullo/core/observable";

export class EventListenerSubscription implements Subscription {
  closed = false;

  constructor(
    private htmlElement: HTMLElement,
    private name: string,
    private listener: (this: HTMLElement, event: Event) => void
  ) {
    htmlElement.addEventListener(this.name, this.listener);
  }

  cancel() {
    if (this.closed) {
      return;
    }
    this.closed = true;
    this.htmlElement.removeEventListener(this.name, this.listener);
  }
}
