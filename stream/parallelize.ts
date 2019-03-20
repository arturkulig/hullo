import { Observable, Observer } from "./observable";
import { channel, Channel } from "./channel";
import { Task, all, resolved } from "../task";

export function parallelize<I, O>(
  xf: (detailInput$: Observable<I>) => O,
  index?: (detailInput: I) => string
) {
  return index
    ? function parallelize_op(source: Observable<I[]>) {
        return function parallelize_observable(outerObserver: Observer<O[]>) {
          return parallelize_observable_indexed(
            xf,
            index,
            source,
            outerObserver
          );
        };
      }
    : function parallelize_op(source: Observable<I[]>) {
        return function parallelize_observable(outerObserver: Observer<O[]>) {
          return parallelize_observable_collected(xf, source, outerObserver);
        };
      };
}

function parallelize_observable_collected<I, O>(
  xf: (detailInput$: Observable<I>) => O,
  source: Observable<I[]>,
  outerObserver: Observer<O[]>
) {
  const detailInput$List: Channel<I>[] = [];
  const output: O[] = [];
  return source({
    next: function parallelize_source_next(list: I[]): Task<any> {
      const deliveries: Task<any>[] = [];
      let needsToPushOutput = false;

      for (let i = 0; i < list.length && i < output.length; i++) {
        if (detailInput$List[i].valueOf() !== list[i]) {
          deliveries.push(detailInput$List[i].next(list[i]));
        }
      }

      if (list.length > output.length) {
        for (let i = output.length, l = list.length; i < l; i++) {
          needsToPushOutput = true;
          const detailInput$ = channel();
          detailInput$List.push(detailInput$);
          output.push(xf(detailInput$));
          const delivery = detailInput$.next(list[i]);
          if (delivery !== resolved) {
            deliveries.push(delivery);
          }
        }
      } else if (list.length < output.length) {
        for (let i = list.length, l = output.length; i < l; i++) {
          needsToPushOutput = true;
          const delivery = detailInput$List[i].complete();
          if (delivery !== resolved) {
            deliveries.push(delivery);
          }
        }
        detailInput$List.splice(list.length);
        output.splice(list.length);
      }

      if (needsToPushOutput) {
        deliveries.push(outerObserver.next(output.concat([])));
      }

      return all(deliveries);
    },
    complete: function parallelize_source_complete() {
      output.splice(0);
      return all(detailInput$List.splice(0).map(input => input.complete()));
    }
  });
}

function parallelize_observable_indexed<I, O>(
  xf: (detailInput$: Observable<I>) => O,
  index: (detailInput: I) => string,
  source: Observable<I[]>,
  outerObserver: Observer<O[]>
) {
  let detailInput$s: Channel<I>[] = [];
  let keys: string[] = [];
  let output: O[] = [];
  return source({
    next: function parallelize_source_next(list: I[]): Task<any> {
      const nextDetailInput$s: Channel<I>[] = [];
      const nextKeys: string[] = [];
      const nextOutput: O[] = [];
      const deliveries: Task<any>[] = [];
      let needsToPushOutput = false;

      for (let i = 0; i < list.length; i++) {
        const key = index(list[i]);
        const prevPos = keys.indexOf(key);

        if (prevPos >= 0) {
          nextDetailInput$s[i] = detailInput$s[prevPos];
          nextKeys[i] = keys[prevPos];
          nextOutput[i] = output[prevPos];

          if (prevPos !== i) {
            needsToPushOutput = true;
          }
          if (nextDetailInput$s[i].valueOf() !== list[i]) {
            const delivery = nextDetailInput$s[i].next(list[i]);
            if (delivery !== resolved) {
              deliveries.push(delivery);
            }
          }
        } else {
          needsToPushOutput = true;
          const newDetailInput$ = channel();
          const newOutputEntry = xf(newDetailInput$);
          nextKeys[i] = index(list[i]);
          nextDetailInput$s[i] = newDetailInput$;
          nextOutput[i] = newOutputEntry;
          const delivery = newDetailInput$.next(list[i]);
          if (delivery !== resolved) {
            deliveries.push(delivery);
          }
        }
      }

      for (let i = 0, l = keys.length; i < l; i++) {
        if (nextKeys.indexOf(keys[i]) < 0) {
          needsToPushOutput = true;
          const delivery = detailInput$s[i].complete();
          if (delivery !== resolved) {
            deliveries.push(delivery);
          }
        }
      }

      if (needsToPushOutput) {
        const delivery = outerObserver.next(nextOutput.concat([]));
        if (delivery !== resolved) {
          deliveries.push(delivery);
        }
      }

      detailInput$s = nextDetailInput$s;
      keys = nextKeys;
      output = nextOutput;

      return deliveries.length ? all(deliveries) : resolved;
    },
    complete: function parallelize_source_complete() {
      const deliveries: Task<any>[] = [];
      for (let i = 0, l = detailInput$s.length; i < l; i++) {
        const delivery = detailInput$s[i].complete();
        if (delivery !== resolved) {
          deliveries.push(delivery);
        }
      }
      return all(deliveries);
    }
  });
}
