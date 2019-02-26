import { Task } from "./task";
import { schedule } from "./schedule";

export { solution };

type State<T> =
  | { type: "none" }
  | {
      type: "awaiting";
      cancel: () => void;
      consumers: Array<(value: T) => any>;
    }
  | { type: "result"; result: T };

function solution<T = void>(producer: Task<T>): Task<T> {
  let state: State<T> = { type: "none" };

  return consume => {
    if (state.type === "none") {
      const nextState: State<T> = {
        type: "awaiting",
        consumers: [consume],
        cancel: () => {
          state = { type: "none" };
        }
      };
      state = nextState;
      nextState.cancel = producer(value => {
        if (state.type === "awaiting") {
          const { consumers } = state;
          state = { type: "result", result: value };
          while (consumers.length) {
            const aConsumer = consumers.shift()!;
            schedule(aConsumer, value);
          }
        }
      });
    } else if (state.type === "awaiting") {
      state.consumers.push(consume);
    } else if (state.type === "result") {
      schedule(consume, state.result);
    }

    return () => {
      if (state.type === "awaiting") {
        const { cancel, consumers } = state;
        if (consumers.includes(consume)) {
          consumers.splice(consumers.indexOf(consume), 1);
          if (consumers.length === 0) {
            state = { type: "none" };
            schedule(cancel);
          }
        }
      }
    };
  };
}
