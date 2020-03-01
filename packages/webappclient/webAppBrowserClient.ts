import { DTOTemplate } from "@hullo/webapp/DTOTemplate";
import {
  isReadyPacket,
  isDataPacket,
  isEndPacket,
  StartPacket,
  MessageTypeMark,
  DataPacket,
  EndPacket,
  ReadyPacket
} from "@hullo/webapp/MessageType";
import { Validator, isAny } from "@hullo/validate";
import { serialize, deserialize } from "@hullo/messagepack";
import { Duplex } from "@hullo/core/Duplex";
import { Channel } from "@hullo/core/Channel";
import { ofWebSocket } from "@hullo/browser/ofWebSocket";

interface ProcessInfo<
  Template extends DTOTemplate,
  CMD extends keyof Template
> {
  active: boolean;
  response$: Channel<Template[CMD]["response"]>;
  validate: Validator<Template[CMD]["response"]>;
  msgQueue: (
    | { type: "value"; value: unknown; ack: () => any }
    | { type: "complete"; ack: () => any }
  )[];
  lastMessageAckReceived: null | (() => any);
}

export function webAppBrowserClient<Template extends DTOTemplate>(
  url: string,
  validators?: { [id in keyof Template]: Validator<Template[id]["response"]> }
) {
  const _ws = new WebSocket(url);
  const ws = ofWebSocket(_ws);
  const processes = new Array<ProcessInfo<Template, keyof Template>>();

  ws.subscribe({
    next(message) {
      if (typeof message === "string") {
        return handleResponse(JSON.parse(message));
      } else if (message instanceof ArrayBuffer) {
        return handleResponse(deserialize(message));
      }
    }
  });

  return request;

  async function handleResponse(response: unknown) {
    if (isDataPacket(response)) {
      await handleDataPacket(response);
    } else if (isReadyPacket(response)) {
      await handleReadyPacket(response);
    } else if (isEndPacket(response)) {
      await handleEndPacket(response);
    }
  }

  async function handleDataPacket(response: DataPacket) {
    const [, procIdx, data] = response;
    if (!processes[procIdx]) {
      throw new Error(
        `Process #${procIdx} has not been initialized. Protocol Error.`
      );
    }
    if (processes[procIdx].validate(data)) {
      await processes[procIdx].response$.next(data);
    } else {
      throw new Error(`Process #${procIdx} has received invalid message`);
    }
    const readyPacket: ReadyPacket = [MessageTypeMark.Ready, procIdx];
    await ws.next(serialize(readyPacket));
  }

  function handleReadyPacket(response: ReadyPacket) {
    const [, procIdx] = response;
    if (!processes[procIdx]) {
      throw new Error(
        `Process #${procIdx} has not been initialized. Protocol Error.`
      );
    }
    const { lastMessageAckReceived } = processes[procIdx];
    processes[procIdx].lastMessageAckReceived = null;
    lastMessageAckReceived?.();
  }

  function handleEndPacket(response: EndPacket) {
    const [, procIdx] = response;
    if (!processes[procIdx]) {
      throw new Error(
        `Process #${procIdx} has not been initialized. Protocol Error.`
      );
    }
    processes[procIdx].response$.complete();
  }

  function request<CMD extends keyof Template>(
    command: CMD
  ): Duplex<Template[CMD]["request"], Template[CMD]["response"]> {
    const processNo = processes.length;

    const response$ = new Channel<Template[CMD]["response"]>();
    const processInfo: ProcessInfo<Template, CMD> = {
      active: true,
      response$,
      msgQueue: [],
      lastMessageAckReceived: null,
      validate: validators?.[command] || isAny
    };

    processes.push(
      (processInfo as unknown) as ProcessInfo<Template, keyof Template>
    );
    const startMessage: StartPacket = [
      MessageTypeMark.Start,
      processNo,
      String(command)
    ];
    ws.next(serialize(startMessage));

    return new Duplex<Template[CMD]["request"], Template[CMD]["response"]>(
      response$,
      {
        get closed() {
          return ws.closed || !processInfo.active;
        },
        next(value: Template[CMD]["request"]) {
          return new Promise<unknown>(resolve => {
            processInfo.msgQueue.push({ type: "value", value, ack: resolve });
            tryPushing(processInfo);
          });
        },
        async complete() {
          return new Promise<unknown>(resolve => {
            processInfo.active = false;
            processInfo.msgQueue.push({ type: "complete", ack: resolve });
            tryPushing(processInfo);
          });
        }
      }
    );

    function tryPushing<CMD extends keyof Template>(
      processInfo: ProcessInfo<Template, CMD>
    ) {
      if (processInfo.msgQueue.length) {
        const message = processInfo.msgQueue.shift()!;
        switch (message.type) {
          case "value":
            const dataPacket: DataPacket = [
              MessageTypeMark.Data,
              processNo,
              message.value
            ];
            processInfo.lastMessageAckReceived = message.ack;
            return ws.next(serialize(dataPacket));

          case "complete":
            const endPacket: EndPacket = [MessageTypeMark.End, processNo];
            processInfo.lastMessageAckReceived = message.ack;
            return ws.next(serialize(endPacket));
        }
      }
    }
  }
}
