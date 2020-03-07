import { Duplex } from "@hullo/core/Duplex";
import { Channel } from "@hullo/core/Channel";
import { Observer } from "@hullo/core/Observable";
import { Atom } from "@hullo/core/Atom";
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
import {
  TransportConnection,
  WebAppLike,
  Responders,
  AppExchangeScheme
} from "./types";

type MessageQueueEntry =
  | { type: "value"; value: unknown; ack: () => any }
  | { type: "complete"; ack: () => any };

interface WebAppProcess {
  idx: number;
  active: boolean;
  command: string;
  incoming$: Duplex<unknown, unknown>;
  msgQueue: MessageQueueEntry[];
  lastMessageAckReceived: null | (() => any);
}

interface WebAppConnection<SessionData> {
  id: number;
  io$: Duplex<unknown, unknown>;
  sessionData$: Atom<SessionData>;
  procs: WebAppProcess[];
}

export class WebApp<SessionData, Exchange extends AppExchangeScheme>
  implements WebAppLike<SessionData> {
  constructor(
    public createSession: (id: number) => SessionData,
    private responders: Responders<SessionData, Exchange>
  ) {}

  handleConnection(transportConnection: TransportConnection<SessionData>) {
    const connection: WebAppConnection<SessionData> = {
      ...transportConnection,
      procs: []
    };
    connection.io$.subscribe(
      new ConnectionIncomingHandler(connection, this.responders)
    );
  }
}

class ConnectionIncomingHandler<SessionData, Exchange extends AppExchangeScheme>
  implements Observer<unknown> {
  get closed() {
    return true;
  }

  constructor(
    private connection: WebAppConnection<SessionData>,
    private responders: Responders<SessionData, Exchange>
  ) {}

  async next(message: unknown) {
    if (isStartPacket(message)) {
      this.handleStartPacket(message);
    } else if (isReadyPacket(message)) {
      this.handleReadyPacket(message);
    } else if (isDataPacket(message)) {
      this.handleDataPacket(message);
    } else if (isEndPacket(message)) {
      this.handleEndPacket(message);
    } else {
      await this.connection.io$.complete();
      throw new Error(
        `Request ${(() => {
          try {
            return JSON.stringify(message);
          } catch {
            return "[unserializable]";
          }
        })()}of connection #${this.connection.id}`
      );
    }
  }

  async complete() {
    for (const process of this.connection.procs.splice(0)) {
      process.incoming$.complete();
      for (const entry of process.msgQueue.splice(0)) {
        if (entry.type === "value" || entry.type === "complete") {
          entry.ack();
        }
      }
    }
  }

  private handleStartPacket(request: [MessageTypeMark.Start, number, string]) {
    const [, procIdx, command] = request;
    if (this.connection.procs[procIdx]) {
      throw new Error(
        `Channel #${procIdx} of connection #${this.connection.id} already started`
      );
    }
    if (!(command in this.responders)) {
      throw new Error(
        `Responder "${command}" doesn't exist for connection #${this.connection.id} start message`
      );
    }
    const responder = this.responders[command];
    const incoming$ = new Channel<unknown>();
    const processInfo: WebAppProcess = {
      idx: procIdx,
      active: true,
      incoming$,
      command,
      lastMessageAckReceived: null,
      msgQueue: []
    };
    this.connection.procs[procIdx] = processInfo;
    responder.respond(
      new Duplex<unknown, unknown>(
        incoming$,
        new ProcessOutgoingHandler(processInfo, this.connection)
      ),
      this.connection.sessionData$
    );
  }

  handleReadyPacket(request: [MessageTypeMark.Ready, number]) {
    const [, procIdx] = request;
    if (!this.connection.procs[procIdx]) {
      throw new Error(
        `Process #${procIdx} of connection #${this.connection.id} doesn't exist`
      );
    }
    const processInfo = this.connection.procs[procIdx];
    const { lastMessageAckReceived } = processInfo;
    processInfo.lastMessageAckReceived = null;
    if (lastMessageAckReceived) {
      lastMessageAckReceived();
    }
    trySendingMessages(processInfo, this.connection.io$);
  }

  async handleDataPacket(request: [MessageTypeMark.Data, number, unknown]) {
    const [, procIdx, content] = request;
    if (!this.connection.procs[procIdx]) {
      throw new Error(
        `Channel #${procIdx} of connection #${this.connection.id} has not been started`
      );
    }
    const { incoming$, command } = this.connection.procs[procIdx];
    if (!(command in this.responders)) {
      throw new Error(
        `Responder "${command}" doesn't exist for connection #${this.connection.id} continuation message`
      );
    }
    const responder = this.responders[command];
    if (!responder.validate || responder.validate(content)) {
      await incoming$.next(content);
    }
    const readyPacket: ReadyPacket = [MessageTypeMark.Ready, procIdx];
    await this.connection.io$.next(readyPacket);
  }

  handleEndPacket(request: [MessageTypeMark.End, number]) {
    const [, procIdx] = request;
    if (!this.connection.procs[procIdx]) {
      throw new Error(
        `Channel #${procIdx} of connection #${this.connection.id} has not been started`
      );
    }
    const { incoming$ } = this.connection.procs[procIdx];
    incoming$.complete();
  }
}

class ProcessOutgoingHandler<SessionData> implements Observer<unknown> {
  get closed() {
    return !this.processInfo.active || this.connection.io$.closed;
  }

  constructor(
    private processInfo: WebAppProcess,
    private connection: WebAppConnection<SessionData>
  ) {}

  next(value: unknown) {
    return new Promise<void>(resolve => {
      this.processInfo.msgQueue.push({
        type: "value",
        value,
        ack: resolve
      });
      trySendingMessages(this.processInfo, this.connection.io$);
    });
  }

  complete() {
    return new Promise<void>(resolve => {
      this.processInfo.active = false;
      this.processInfo.msgQueue.push({ type: "complete", ack: resolve });
      trySendingMessages(this.processInfo, this.connection.io$);
    });
  }
}

async function trySendingMessages(
  processInfo: WebAppProcess,
  io$: Observer<unknown>
) {
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
          processInfo.idx,
          messageQueueEntry.value
        ];
        await io$.next(dataPacket);
        break;

      case "complete":
        const endPacket: EndPacket = [MessageTypeMark.End, processInfo.idx];
        await io$.next(endPacket);
        messageQueueEntry.ack();
        break;
    }
  }
}
