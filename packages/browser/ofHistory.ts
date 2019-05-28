import { Observable, ComplexProducer, Observer } from "@hullo/core/Observable";
import { Duplex } from "@hullo/core/Duplex";
import { state } from "@hullo/core/operators/state";
import { History, Location, Action, LocationDescriptorObject } from "history";

interface HistoryDuplex<HistoryLocationState>
  extends Duplex<
    LocationDescriptorObject<HistoryLocationState>,
    Location<HistoryLocationState>
  > {}

export function ofHistory<HistoryLocationState = any>(
  history: History<HistoryLocationState>
): HistoryDuplex<HistoryLocationState> {
  const acks: Array<() => any> = [];
  return new Duplex(
    new Observable(new HistoryProducer(history, acks)).pipe(
      state(history.location)
    ),
    new HistoryInput(history, acks)
  );
}

class HistoryProducer<HistoryLocationState>
  implements ComplexProducer<Location<HistoryLocationState>> {
  constructor(
    private history: History<HistoryLocationState>,
    private acks: Array<() => any>
  ) {}

  subscribe(observer: Observer<Location<HistoryLocationState>>) {
    return this.history.listen(
      (location: Location<HistoryLocationState>, _action: Action) => {
        const acks = this.acks.splice(0);
        observer.next(location).then(() => {
          acks.forEach(call);
        });
      }
    );
  }
}

function call(f: () => any) {
  f();
}

class HistoryInput<HistoryLocationState>
  implements Observer<LocationDescriptorObject<HistoryLocationState>> {
  get closed() {
    return false;
  }

  constructor(
    private history: History<HistoryLocationState>,
    private acks: Array<() => any>
  ) {}

  next(next: LocationDescriptorObject<HistoryLocationState>) {
    return new Promise(resolve => {
      this.acks.push(resolve);
      this.history.push(next);
    });
  }

  complete() {
    return Promise.resolve();
  }
}
