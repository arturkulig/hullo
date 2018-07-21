import { AsyncObserver } from "../streams";
import { subject } from "../mods/subject";
import { queue } from "../mods/queue";
import { hot } from "../mods/hot";
import { observable } from "../streams";

export function expose<T, ERR>(
  output: (input$: AsyncIterable<T>) => AsyncIterable<T>
): AsyncIterable<T> & AsyncObserver<T, ERR> {
  let innerObserver: AsyncObserver<T, ERR> | null = null;

  const outer$ = output(
    subject(
      hot(
        observable<T, ERR>(
          queue(observer => {
            innerObserver = observer;
            return () => {
              innerObserver = null;
            };
          })
        )
      )
    )
  );

  return {
    [Symbol.asyncIterator]() {
      return outer$[Symbol.asyncIterator]();
    },
    get closed() {
      return innerObserver ? innerObserver.closed : false;
    },
    next(value: T) {
      if (innerObserver == null) {
        throw null;
      }
      return innerObserver.next(value);
    },
    error(error: ERR) {
      if (innerObserver == null) {
        throw null;
      }
      return innerObserver.error(error);
    },
    complete() {
      if (innerObserver == null) {
        throw null;
      }
      return innerObserver.complete();
    }
  };
}
