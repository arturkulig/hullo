import { AsyncObserver } from "../observable/observableTypes";
import { subject } from "../observable/subject";
import { observable } from "../observable/observable";
import { queue } from "../observable/queue";
import { Subscription, subscribe } from "../observable/subscribe";

interface TopicMessage<T, TOPICS extends string> {
  topic: TOPICS;
  value: T;
}

export type Publication<T, TOPICS extends string> = AsyncIterable<
  TopicMessage<T, TOPICS>
>;

export function publication<T, TOPICS extends string, ERR = Error>(
  origin: Publication<T, TOPICS>
) {
  const receivers: { [subject in TOPICS]?: AsyncObserver<T, ERR> } = {};
  const outputs: { [subject in TOPICS]?: AsyncIterable<T> } = {};
  let originSub: Subscription | null = null;

  return (topic: TOPICS) => {
    return (
      outputs[topic] ||
      (outputs[topic] = subject<T, ERR>(
        observable<T, ERR>(
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
      async next({ topic, value }: TopicMessage<T, TOPICS>) {
        const topicReceiver = receivers[topic];
        if (topicReceiver) {
          await topicReceiver.next(value);
        }
      },
      async error(error: ERR) {
        await Promise.all(values(receivers).map(r => r.error(error)));
      },
      async complete() {
        await Promise.all(values(receivers).map(r => r.complete()));
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
