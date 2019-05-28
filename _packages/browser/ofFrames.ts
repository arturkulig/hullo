import {
  Observable,
  ComplexProducer,
  Observer,
  Subscription
} from "@hullo/core/Observable";

interface RAFController {
  requestAnimationFrame: Window["requestAnimationFrame"];
  cancelAnimationFrame: Window["cancelAnimationFrame"];
}

export function ofFrames(wnd: RAFController = window) {
  return new Observable(new RAFProducer(wnd));
}

class RAFProducer implements ComplexProducer<number> {
  constructor(private wnd: RAFController = window) {}

  subscribe(subscriber: Observer<number>) {
    return new RAFSubscription(this.wnd, subscriber);
  }
}

class RAFSubscription implements Subscription {
  rafToken: number | null = null;
  closed = false;

  constructor(
    private wnd: RAFController = window,
    private subscriber: Observer<number>
  ) {
    this.post();
  }

  post() {
    this.rafToken = this.wnd.requestAnimationFrame(async () => {
      await this.subscriber.next(Date.now());
      this.post();
    });
  }

  cancel() {
    if (this.rafToken != null) {
      this.wnd.cancelAnimationFrame(this.rafToken);
      this.rafToken = null;
    }
  }
}
