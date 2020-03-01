import { Duplex } from "@hullo/core/Duplex";
import { Channel } from "@hullo/core/Channel";
import { Observer } from "@hullo/core/Observable";
import { Atom } from "@hullo/core/Atom";
import { DTOTemplate } from "./DTOTemplate";
import {
  isStartPacket,
  isReadyPacket,
  isDataPacket,
  isEndPacket,
  MessageTypeMark,
  EndPacket,
  ReadyPacket,
  DataPacket
} from "./MessageType";
import { WebApp } from "./types";
import { Responders } from "./Responders";

type MessageQueueEntry =
  | { type: "value"; value: unknown; ack: () => any }
  | { type: "complete"; ack: () => any };

type ProcessInfo = {
  active: boolean;
  command: string;
  incoming$: Duplex<unknown, unknown>;
  msgQueue: MessageQueueEntry[];
  lastMessageAckReceived: null | (() => any);
};

interface ConnectionState<SessionData> {
  id: number;
  io$: Duplex<unknown, unknown>;
  sessionData$: Atom<SessionData>;
  procs: ProcessInfo[];
}

export function createWebApp<SessionData, DTOs extends DTOTemplate>(
  createSession: WebApp<SessionData>["createSession"],
  responders: Responders<SessionData, DTOs>
): WebApp<SessionData> {
  return {
    createSession,
    handleConnection({ io$, sessionData$, id }) {
      const connectionState: ConnectionState<SessionData> = {
        id,
        io$,
        sessionData$,
        procs: []
      };
      io$.subscribe({
        async next(message: unknown) {
          if (isStartPacket(message)) {
            handleStartPacket(message, connectionState);
          } else if (isReadyPacket(message)) {
            handleReadyPacket(message, connectionState);
          } else if (isDataPacket(message)) {
            handleDataPacket(message, connectionState);
          } else if (isEndPacket(message)) {
            handleEndPacket(message, connectionState);
          } else {
            await io$.complete();
            throw new Error(
              `Request ${(() => {
                try {
                  return JSON.stringify(message);
                } catch {
                  return "[unserializable]";
                }
              })()}of connection #${id}`
            );
          }
        },
        async complete() {
          for (const process of connectionState.procs.splice(0)) {
            process.incoming$.complete();
            for (const entry of process.msgQueue.splice(0)) {
              if (entry.type === "value" || entry.type === "complete") {
                entry.ack();
              }
            }
          }
        }
      });
    }
  };

  function handleStartPacket(
    request: [MessageTypeMark.Start, number, string],
    state: ConnectionState<SessionData>
  ) {
    const [, procIdx, command] = request;
    if (state.procs[procIdx]) {
      throw new Error(
        `Channel #${procIdx} of connection #${state.id} already started`
      );
    }
    if (!(command in responders)) {
      throw new Error(
        `Responder "${command}" doesn't exist for connection #${state.id} start message`
      );
    }
    const controller = responders[command];
    const incoming$ = new Channel<unknown>();
    const processInfo: ProcessInfo = {
      active: true,
      incoming$,
      command,
      lastMessageAckReceived: null,
      msgQueue: []
    };
    state.procs[procIdx] = processInfo;
    const commandResultHandler: Observer<unknown> = {
      get closed() {
        return !processInfo.active || state.io$.closed;
      },
      next(value: unknown) {
        return new Promise<void>(resolve => {
          processInfo.msgQueue.push({
            type: "value",
            value,
            ack: resolve
          });
          trySendingMessages(state, procIdx);
        });
      },
      complete() {
        return new Promise<void>(resolve => {
          processInfo.active = false;
          processInfo.msgQueue.push({ type: "complete", ack: resolve });
          trySendingMessages(state, procIdx);
        });
      }
    };
    controller.respond(
      new Duplex<unknown, unknown>(incoming$, commandResultHandler),
      state.sessionData$
    );
  }

  async function trySendingMessages(
    state: ConnectionState<SessionData>,
    procIdx: number
  ) {
    const processInfo = state.procs[procIdx];
    while (
      processInfo.msgQueue.length &&
      processInfo.lastMessageAckReceived === null
    ) {
      const messageQueueEntry = processInfo.msgQueue.shift()!;
      switch (messageQueueEntry.type) {
        case "value":
          processInfo.lastMessageAckReceived = messageQueueEntry.ack;
          const dataPacket: DataPacket = [
            MessageTypeMark.Data,
            procIdx,
            messageQueueEntry.value
          ];
          await state.io$.next(dataPacket);
          break;

        case "complete":
          const endPacket: EndPacket = [MessageTypeMark.End, procIdx];
          await state.io$.next(endPacket);
          messageQueueEntry.ack();
          break;
      }
    }
  }

  function handleReadyPacket(
    request: [MessageTypeMark.Ready, number],
    state: ConnectionState<SessionData>
  ) {
    const [, procIdx] = request;
    if (!state.procs[procIdx]) {
      throw new Error(
        `Process #${procIdx} of connection #${state.id} doesn't exist`
      );
    }
    const { lastMessageAckReceived } = state.procs[procIdx];
    state.procs[procIdx].lastMessageAckReceived = null;
    lastMessageAckReceived?.();
  }

  async function handleDataPacket(
    request: [MessageTypeMark.Data, number, unknown],
    state: ConnectionState<SessionData>
  ) {
    const [, procIdx, content] = request;
    if (!state.procs[procIdx]) {
      throw new Error(
        `Channel #${procIdx} of connection #${state.id} has not been started`
      );
    }
    const { incoming$, command } = state.procs[procIdx];
    if (!(command in responders)) {
      throw new Error(
        `Responder "${command}" doesn't exist for connection #${state.id} continuation message`
      );
    }
    const controller = responders[command];
    if (!controller.validate || controller.validate(content)) {
      await incoming$.next(content);
    }
    const readyPacket: ReadyPacket = [MessageTypeMark.Ready, procIdx];
    await state.io$.next(readyPacket);
  }

  function handleEndPacket(
    request: [MessageTypeMark.End, number],
    state: ConnectionState<SessionData>
  ) {
    const [, procIdx] = request;
    if (!state.procs[procIdx]) {
      throw new Error(
        `Channel #${procIdx} of connection #${state.id} has not been started`
      );
    }
    const { incoming$ } = state.procs[procIdx];
    incoming$.complete();
  }
}
