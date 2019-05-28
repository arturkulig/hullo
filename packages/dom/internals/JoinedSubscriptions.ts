import { Subscription } from "@hullo/core/Observable";

export class JoinedSubscriptions implements Subscription {
  get closed() {
    for (const subscription of this.subscriptions) {
      if (subscription.closed) {
        return false;
      }
    }
    return true;
  }

  constructor(private subscriptions: Subscription[]) {}

  cancel() {
    for (const subscription of this.subscriptions) {
      if (!subscription.closed) {
        subscription.cancel();
      }
    }
  }
}
