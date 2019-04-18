import { observable } from "@hullo/core/observable";
import { duplex, Duplex } from "@hullo/core/duplex";
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
  return duplex(
    observable<Location<HistoryLocationState>>(observer => {
      const sub = history.listen(
        (location: Location<HistoryLocationState>, _action: Action) => {
          observer.next(location);
        }
      );
      return sub;
    }).pipe(state(history.location)),
    {
      get closed() {
        return false;
      },
      next(next: LocationDescriptorObject<HistoryLocationState>) {
        history.push(next);
        return Promise.resolve();
      },
      complete() {
        return Promise.resolve();
      }
    }
  );
}
