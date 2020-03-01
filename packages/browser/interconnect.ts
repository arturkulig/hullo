import { ofMessagePort, MessagePortDuplex } from "./ofMessagePort";
import { Duplex } from "@hullo/core/Duplex";
import { Channel } from "@hullo/core/Channel";
import { isString, isObject, isAny } from "@hullo/validate";

export interface InterconnectedMessage {
  context: string;
  content: unknown;
}

/**
interface InternalMessage {
  type: "message";
  context: string;
  content: unknown;
}

interface InternalAnnouncement {
  type: "announce";
  context: string;
  port: MessagePort;
}

interface InternalAcknowledgement {
  type: "ack";
  context: string;
}
*/

const isEventWithType = isObject({ data: isObject({ type: isString }) });
const isMessage = isObject({
  type: isString,
  context: isString,
  content: isAny
});
const isAck = isObject({ type: isString, context: isString });
const isAnnouncement = isObject({
  type: isString,
  context: isString,
  port: isAny
});

export function interconnect(
  name: string,
  hubIn: MessagePort,
  hubOut: MessagePort
): Duplex<InterconnectedMessage, InterconnectedMessage> {
  const mch = new MessageChannel();
  const ins = new Channel<InterconnectedMessage>();
  const closed = { value: false };
  const outsChannels: { [id: string]: MessagePortDuplex } = {};
  const outsStatus: {
    [id: string]: {
      queue: Array<{ content: unknown; ack: () => unknown }>;
      locks: number;
    };
  } = {};

  const selfOutSub = ofMessagePort(mch.port2).subscribe({
    next: async event => {
      if (!isEventWithType(event)) {
        return;
      }
      const { data } = event;
      switch (data.type) {
        case "message": {
          if (isMessage(data)) {
            const { context, content } = data;
            await ins.next({ context, content });
            if (!outsChannels[context]) {
              throw new Error(
                "interconnected channel did not announce itself on a hub channel"
              );
            }
            outsChannels[context].next({
              type: "ack",
              context: name
            });
          }
          break;
        }

        case "ack": {
          if (isAck(data)) {
            const { context } = data;
            ensureOutsStatus(context);
            outsStatus[context].locks--;
            tryPushFor(context);
          }
          break;
        }
      }
    }
  });

  hubIn.postMessage({ type: "announce", context: name, port: mch.port1 }, [
    mch.port1
  ]);

  const hubOutSub = ofMessagePort(hubOut).subscribe({
    next: async event => {
      if (!isEventWithType(event)) {
        return;
      }
      const { data } = event;
      switch (data.type) {
        case "announce": {
          hubIn.postMessage(
            { type: "announceBack", context: name, port: mch.port1 },
            [mch.port1]
          );

          if (isAnnouncement(data)) {
            assumePort(data.context, data.port as MessagePort);
          }
          break;
        }

        case "announceBack": {
          if (isAnnouncement(data)) {
            assumePort(data.context, data.port as MessagePort);
          }
          break;
        }
      }
    }
  });

  return new Duplex(ins, {
    get closed() {
      return closed.value;
    },
    next: ({ content, context }: InterconnectedMessage) => {
      if (closed.value) {
        return Promise.resolve();
      }

      return new Promise(resolve => {
        ensureOutsStatus(context);
        outsStatus[context].queue.push({ content, ack: resolve });
        tryPushFor(context);
      });
    },
    complete: async () => {
      if (closed.value) {
        return;
      }
      closed.value = true;
      selfOutSub.cancel();
      hubOutSub.cancel();
    }
  });

  function assumePort(context: string, port: MessagePort) {
    if (!outsChannels[context] || outsChannels[context].port !== port) {
      outsChannels[context] = ofMessagePort(port as MessagePort);
    }
  }

  async function tryPushFor(context: string) {
    ensureOutsStatus(context);
    if (
      outsChannels[context] &&
      outsStatus[context].queue.length &&
      outsStatus[context].locks === 0
    ) {
      outsStatus[context].locks++;
      const content = outsStatus[context].queue.shift()!;
      await outsChannels[context].next({
        type: "message",
        context: name,
        content
      });
      tryPushFor(context);
    }
  }

  function ensureOutsStatus(context: string) {
    if (!outsStatus[context]) {
      outsStatus[context] = { queue: [], locks: 0 };
    }
  }
}
