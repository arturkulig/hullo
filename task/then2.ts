import { Task, Cancellation } from "./task";
import { schedule } from "./schedule";

interface State<T, U> {
  f: (v: T) => Task<U>;
  source: Task<T>;
  cancelled: boolean;
  cancel: null | Cancellation;
  consume: (value: U) => void;
}

export function then2<T, U>(f: (v: T) => Task<U>) {
  return function then2I(source: Task<T>): Task<U> {
    return function then2II(consume) {
      const state: State<T, U> = {
        f,
        source,
        consume,
        cancelled: false,
        cancel: null
      };

      schedule(then2_runSource, state);

      return function then2_cancel() {
        state.cancelled = true;
        if (state.cancel) {
          state.cancel();
        }
      };
    };
  };
}

function then2_runSource<T, U>(state: State<T, U>) {
  if (state.cancelled) {
    return;
  }
  state.cancel = state.source(function then2_runSource_value(v) {
    return then2_consumeOfSource(state, v);
  });
}

function then2_consumeOfSource<T, U>(state: State<T, U>, v: T) {
  schedule(then2_passOn, state, v);
}

function then2_passOn<T, U>(state: State<T, U>, v: T) {
  if (state.cancelled) {
    return;
  }
  state.cancel = state.f(v)(state.consume);
}
