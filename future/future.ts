import { Task, Cancellation } from "./task";
import { schedule } from "./schedule";

export { future, futureFromPromise };

function future<T = void>(producer: Task<T>): Task<T> {
  let state:
    | { type: "none" }
    | {
        type: "awaiting";
        cancel: Cancellation;
        consumers: Array<(v: T) => void>;
      }
    | { type: "result"; result: T } = { type: "none" };

  function resolveFuture(value: T) {
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

  state = { type: "awaiting", cancel: () => {}, consumers: [] };
  state.cancel = producer(resolveFuture);

  return consume => {
    if (state.type === "none") {
      state = { type: "awaiting", cancel: () => {}, consumers: [consume] };
      state.cancel = producer(resolveFuture);
    } else if (state.type === "awaiting") {
      state.consumers.push(consume);
    } else if (state.type === "result") {
      schedule(consume, state.result);
    }
    return () => {
      if (state.type === "awaiting") {
        const { cancel } = state;
        state = { type: "none" };
        schedule(cancel);
      }
    };
  };
}

function futureFromPromise<T>(promise: Promise<T>): Task<T> {
  return consume => {
    let cancelled = false;
    promise.then(value => {
      if (!cancelled) {
        consume(value);
      }
    });
    return () => {
      cancelled = true;
    };
  };
}
