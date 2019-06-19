import {
  Observable,
  ComplexProducer,
  Observer,
  Subscription
} from "@hullo/core/Observable";

export function ofFrames(
  wnd: Pick<Window, "requestAnimationFrame" | "cancelAnimationFrame"> = window
) {
  return new Observable(new RAFProducer(wnd));
}

class RAFProducer implements ComplexProducer<number> {
  constructor(
    private wnd: Pick<Window, "requestAnimationFrame" | "cancelAnimationFrame">
  ) {}

  subscribe(subscriber: Observer<number>) {
    return new RAFSubscription(this.wnd, subscriber);
  }
}

class RAFSubscription implements Subscription {
  rafToken: number | null = null;
  closed = false;

  constructor(
    private wnd: Pick<
      Window,
      "requestAnimationFrame" | "cancelAnimationFrame"
    > = window,
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
