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
        const creations = list.slice(output.length);
        for (const item of creations) {
          needsToPushOutput = true;
          const detailInput$ = channel();
          detailInput$List.push(detailInput$);
          output.push(xf(detailInput$));
          deliveries.push(detailInput$.next(item));
        }
      } else if (list.length < output.length) {
        const closures = detailInput$List.splice(list.length);
        output.splice(list.length);
        for (const detailInput of closures) {
          needsToPushOutput = true;
          detailInput.complete();
        }
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
  const detailInput$s: Channel<I>[] = [];
  const keys: string[] = [];
  const output: O[] = [];
  return source({
    next: function parallelize_source_next(list: I[]): Task<any> {
      const deliveries: Task<any>[] = [];
      let needsToPushOutput = false;

      for (let i = 0; i < list.length; i++) {
        const key = index(list[i]);

        const prevPos = keys.indexOf(key);

        if (prevPos >= 0) {
          if (prevPos !== i) {
            needsToPushOutput = true;
            keys.splice(i, 0, keys.splice(prevPos, 1)[0]);
            output.splice(i, 0, output.splice(prevPos, 1)[0]);
            detailInput$s.splice(i, 0, detailInput$s.splice(prevPos, 1)[0]);
          }
          if (detailInput$s[i].valueOf() !== list[i]) {
            deliveries.push(detailInput$s[i].next(list[i]));
          }
        } else {
          needsToPushOutput = true;
          const newDetailInput$ = channel();
          const newOutputEntry = xf(newDetailInput$);
          keys[i] = index(list[i]);
          detailInput$s[i] = newDetailInput$;
          output[i] = newOutputEntry;
          deliveries.push(newDetailInput$.next(list[i]));
        }
      }

      keys.splice(list.length);
      output.splice(list.length);
      for (const closure of detailInput$s.splice(list.length)) {
        needsToPushOutput = true;
        deliveries.push(closure.complete());
      }

      if (needsToPushOutput) {
        deliveries.push(outerObserver.next(output.concat([])));
      }

      return all(deliveries);
    },
    complete: function parallelize_source_complete() {
      output.splice(0);
      return all(
        detailInput$s.map(detailInput$ => {
          return detailInput$ ? detailInput$.complete() : resolved;
        })
      );
    }
  });
}
