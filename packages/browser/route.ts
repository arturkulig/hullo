import {
  Observable,
  ComplexProducer,
  Observer,
  Cancellation,
  Subscription
} from "@hullo/core/Observable";
import { LocationDescriptorObject } from "history";

export function route<T, HistoryLocationState = any>(config: RouteConfig<T>[]) {
  return function routeI(
    source: Observable<LocationDescriptorObject<HistoryLocationState>>
  ) {
    return new Observable<T>(
      new RouteProducer<T, HistoryLocationState>(source, config)
    );
  };
}

class RouteProducer<T, HistoryLocationState> implements ComplexProducer<T> {
  constructor(
    private source: Observable<LocationDescriptorObject<HistoryLocationState>>,
    private config: RouteConfig<T>[]
  ) {}

  subscribe(observer: Observer<T>) {
    const sub = this.source.subscribe(new RouteObserver(this.config, observer));
    return new RoutingCancel(sub);
  }
}

class RoutingCancel implements Cancellation {
  constructor(private sub: Subscription) {}

  cancel() {
    if (!this.sub.closed) {
      this.sub.cancel();
    }
  }
}

class RouteObserver<T, HistoryLocationState>
  implements Observer<LocationDescriptorObject<HistoryLocationState>> {
  constructor(
    private config: RouteConfig<T>[],
    private observer: Observer<T>
  ) {}

  get closed() {
    return this.observer.closed;
  }

  next(location: LocationDescriptorObject<HistoryLocationState>) {
    if (typeof location.pathname === "string") {
      for (const { when, have } of this.config) {
        const result = when.exec(location.pathname);
        if (result) {
          return this.observer.next(have(result.slice(1)));
        }
      }
    }
    return Promise.resolve();
  }

  complete() {
    return this.observer.complete();
  }
}

interface RouteConfig<T> {
  when: RegExp;
  have: (matches: string[]) => T;
}
