import { Observable, Observer } from "./observable";
import { channel, Channel } from "./channel";
import { Task, all, resolved } from "../task";

export function parallelize<I, O>(
  xf: (detailInput$: Observable<I>) => O,
  index?: (detailInput: I) => string
) {
  return function parallelize_op(source: Observable<I[]>) {
    return index
      ? (outerObserver: Observer<O[]>) =>
          parallelize_observable_indexed(xf, index, source, outerObserver)
      : (outerObserver: Observer<O[]>) =>
          parallelize_observable_collected(xf, source, outerObserver);
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
  const detailInput$Index: { [id: string]: Channel<I> | undefined } = {};
  const outputIndex: { [id: string]: O | undefined } = {};
  const output: O[] = [];
  return source({
    next: function parallelize_source_next(list: I[]): Task<any> {
      const deliveries: Task<any>[] = [];
      const iterationUnseenKeys = Object.keys(detailInput$Index);
      let needsToPushOutput = false;

      for (let i = 0; i < list.length; i++) {
        const key = index(list[i]);

        const pos = iterationUnseenKeys.indexOf(key);
        if (pos >= 0) {
          iterationUnseenKeys.splice(pos, 1);
        }

        const detailInput$ = detailInput$Index[key];
        if (detailInput$) {
          output[i] = outputIndex[key]!;
          if (detailInput$.valueOf() !== list[i]) {
            deliveries.push(detailInput$.next(list[i]));
          }
        } else {
          needsToPushOutput = true;
          const newDetailInput$ = channel();
          detailInput$Index[key] = newDetailInput$;
          const newOutputEntry = xf(newDetailInput$);
          output[i] = newOutputEntry;
          outputIndex[key] = newOutputEntry;
        }
      }

      output.splice(list.length);

      if (iterationUnseenKeys.length) {
        needsToPushOutput = true;
        for (let i = 0; i < iterationUnseenKeys.length; i++) {
          const key = iterationUnseenKeys[i];
          const detailInput$ = detailInput$Index[key];
          if (detailInput$) {
            deliveries.push(detailInput$.complete());
          }
          detailInput$Index[key] = undefined;
          outputIndex[key] = undefined;
        }
      }

      if (needsToPushOutput) {
        deliveries.push(outerObserver.next(output.concat([])));
      }

      return all(deliveries);
    },
    complete: function parallelize_source_complete() {
      output.splice(0);
      return all(
        Object.keys(detailInput$Index).map(key => {
          const detailInput$ = detailInput$Index[key];
          return detailInput$ ? detailInput$.complete() : resolved;
        })
      );
    }
  });
}
