import { observable } from "@hullo/core/observable";
import { duplex } from "@hullo/core/duplex";
import { map } from "@hullo/core/operators/map";

export function ofEventEmitter(
  emitter: NodeJS.EventEmitter,
  valueName: string,
  completionName?: string
) {
  return duplex<any[], any[]>(
    observable<any[]>(observer => {
      function next(...args: any[]) {
        observer.next(args);
      }
      function complete() {
        observer.complete();
      }

      emitter.on(valueName, next);
      if (completionName) {
        emitter.on(completionName, complete);
      }

      return () => {
        emitter.off(valueName, next);
        if (completionName) {
          emitter.off(completionName, complete);
        }
      };
    }),
    {
      get closed() {
        return false;
      },

      next(args: any[]) {
        emitter.emit(valueName, ...args);
        return Promise.resolve();
      },

      complete() {
        return Promise.resolve();
      }
    }
  );
}

export function ofEventEmitterV<V>(
  emitter: NodeJS.EventEmitter,
  valueName: string,
  completionName?: string
) {
  const int = ofEventEmitter(emitter, valueName, completionName);
  return duplex<V, V>(int.pipe(map(([v]): V => v)), {
    get closed() {
      return int.closed;
    },

    next(v) {
      return int.next([v]);
    },

    complete() {
      return int.complete();
    }
  });
}

type Result<V, E> = { ok: true; value: V } | { ok: false; error: E; value?: V };

export function ofEventEmitterVE<V, E = Error>(
  emitter: NodeJS.EventEmitter,
  valueName: string,
  completionName?: string
) {
  const int = ofEventEmitter(emitter, valueName, completionName);
  return duplex<Result<V, E>, Result<V, E>>(
    int.pipe(
      map(
        ([e, v]): Result<V, E> =>
          e == null ? { ok: true, value: v } : { ok: false, error: e }
      )
    ),
    {
      get closed() {
        return int.closed;
      },

      next(result) {
        return int.next(
          result.ok ? [null, result.value] : [result.error, result.value]
        );
      },

      complete() {
        return int.complete();
      }
    }
  );
}
