import { Task } from "./task";
import { solution } from "./solution";

export { future, futureFromPromise };

function future<T = void>(producer: Task<T>): Task<T> {
  let state:
    | { type: "none" }
    | { type: "awaiting"; consumer: (v: T) => void }
    | { type: "result"; result: T } = { type: "none" };

  const cancel = producer(value => {
    if (state.type === "awaiting") {
      const { consumer } = state;
      state = { type: "result", result: value };
      consumer(value);
    } else {
      state = { type: "result", result: value };
    }
  });

  return solution<T>(consume => {
    if (state.type === "none") {
      state = { type: "awaiting", consumer: consume };
    } else if (state.type === "awaiting") {
      throw new Error("solution should not call this twice");
    } else if (state.type === "result") {
      consume(state.result);
    }
    return () => {
      state = { type: "none" };
      cancel();
    };
  });
}

function futureFromPromise<T>(promise: Promise<T>) {
  return future<T>(consume => {
    promise.then(consume);
    return () => null;
  });
}
