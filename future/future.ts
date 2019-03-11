import { Task, Cancellation } from "./task";
import { schedule } from "./schedule";

type State<T> =
  | { type: "none" }
  | {
      type: "awaiting";
      cancel?: Cancellation;
      consumers: Array<(v: T) => void>;
    }
  | { type: "result"; result: T };

const INIT_STATE: State<any> = { type: "none" };

export function future<T = void>(producer: Task<T>): Task<T> {
  let state: State<T> = INIT_STATE;

  function future_resolve(value: T) {
    switch (state.type) {
      case "awaiting":
        const { consumers } = state;
        state = { type: "result", result: value };
        for (const consumer of consumers) {
          schedule(consumer, value);
        }
        break;

      case "none":
        state = { type: "result", result: value };
    }
  }

  state = { type: "awaiting", consumers: [] };
  state.cancel = producer(future_resolve);

  return function future_task(consume) {
    if (state.type === "none") {
      state = { type: "awaiting", consumers: [consume] };
      state.cancel = producer(future_resolve);
    } else if (state.type === "awaiting") {
      state.consumers.push(consume);
    } else if (state.type === "result") {
      schedule(consume, state.result);
    }
    return function future_cancel() {
      if (state.type === "awaiting") {
        const { cancel } = state;
        state = INIT_STATE;
        if (cancel) {
          schedule(cancel);
        }
      }
    };
  };
}

export function futureFromPromise<T>(promise: Promise<T>): Task<T> {
  return function futureFromPromise_I(consume) {
    promise.then(consume);
    return noop;
  };
}

export function futureToPromise<T>(aTask: Task<T>): Promise<T> {
  return new Promise(resolve => {
    aTask(resolve);
  });
}

function noop() {}
