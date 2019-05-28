import { Subscription, Observer } from "@hullo/core/observable";

export class EventObserverSubscription implements Subscription {
  listener: <T extends Event>(event: T) => void;

  closed = false;

  constructor(
    private htmlElement: HTMLElement,
    private name: string,
    private observer: Observer<Event>
  ) {
    this.listener = <T extends Event>(event: T) => {
      if (!this.closed) {
        this.observer.next(event);
      }
    };

    htmlElement.addEventListener(this.name, this.listener);
  }

  cancel() {
    if (this.closed) {
      return;
    }
    this.closed = true;
    this.htmlElement.removeEventListener(this.name, this.listener);
    this.observer.complete();
  }
}
