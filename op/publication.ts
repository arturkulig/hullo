import { AsyncObserver } from "../core/streams/observableTypes";
import { observable } from "../core/streams/observable";
import { subject } from "./subject";
import { queue } from "../core/streams/queue";
import { Subscription, subscribe } from "../core/streams/subscribe";

interface TopicMessage<T, TOPICS extends string> {
  topic: TOPICS;
  value: T;
}

export type Publication<T, TOPICS extends string> = AsyncIterable<
  TopicMessage<T, TOPICS>
>;

export function publication<T, TOPICS extends string>(
  origin: Publication<T, TOPICS>
) {
  const receivers: { [subject in TOPICS]?: AsyncObserver<T> } = {};
  const outputs: { [subject in TOPICS]?: AsyncIterable<T> } = {};
  let originSub: Subscription | null = null;

  return (topic: TOPICS) => {
    return (
      outputs[topic] ||
      (outputs[topic] = subject<T>(
        observable<T>(
          queue(observer => {
            receivers[topic] = observer;

            if (!originSub) {
              originSub = subscribeOrigin();
            }

            return () => {
              if (originSub) {
                if (!originSub.closed) {
                  originSub.unsubscribe();
                }
                originSub = null;
              }
            };
          })
        )
      ))
    );
  };

  function subscribeOrigin() {
    return subscribe(origin, {
      next({ topic, value }: TopicMessage<T, TOPICS>) {
        const topicReceiver = receivers[topic];
        if (topicReceiver) {
          return topicReceiver.next(value);
        }
      },
      error(error: any) {
        return Promise.all(values(receivers).map(r => r.error(error)));
      },
      complete() {
        return Promise.all(values(receivers).map(r => r.complete()));
      }
    });
  }
}

function values<T extends object, U extends T[keyof T]>(
  input: T
): Array<U extends undefined ? never : U> {
  const result = [];
  for (const k in input) {
    result.push(input[k]);
  }
  return result as any;
}
