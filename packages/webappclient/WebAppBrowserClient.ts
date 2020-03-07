import { AppExchangeScheme } from "@hullo/webapp/types";
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
import { Observer } from "@hullo/core/Observable";
import { ofWebSocket, WebSocketIO } from "@hullo/browser/ofWebSocket";

export class WebAppBrowserClient<Exchange extends AppExchangeScheme> {
  private websocketIO: WebSocketIO;
  private processes = new Array<Process<Exchange, keyof Exchange>>();

  constructor(
    ws: WebSocket,
    private validators?: {
      [id in keyof Exchange]?: Validator<Exchange[id]["response"]>;
    }
  ) {
    this.websocketIO = ofWebSocket(ws);
    this.websocketIO.subscribe(new WebSocketIncomingObserver(this.processes));
  }

  spawn<CMD extends keyof Exchange>(command: CMD) {
    const procIdx = this.processes.length;

    const response$ = new Channel<Exchange[CMD]["response"]>();
    const validateResponse: Validator<Exchange[CMD]["request"]> =
      this.validators && this.validators[command]
        ? this.validators[command]!
        : isAny;
    const processInfo = new Process<Exchange, CMD>(
      procIdx,
      response$,
      validateResponse,
      this.websocketIO
    );

    this.processes.push(processInfo as any);

    const startMessage: StartPacket = [
      MessageTypeMark.Start,
      procIdx,
      String(command)
    ];
    // console.log("out", "start", procIdx);
    this.websocketIO.next(serialize(startMessage));

    return new Duplex<Exchange[CMD]["request"], Exchange[CMD]["response"]>(
      response$,
      new ProcessOutgoingComms(processInfo)
    );
  }
}

class WebSocketIncomingObserver<Exchange extends AppExchangeScheme>
  implements Observer<ArrayBuffer | string> {
  get closed() {
    return true;
  }

  constructor(private processes: Array<Process<Exchange, keyof Exchange>>) {}

  next(message: ArrayBuffer | string) {
    if (typeof message === "string") {
      return this.handleIncoming(JSON.parse(message));
    } else if (message instanceof ArrayBuffer) {
      return this.handleIncoming(deserialize(message));
    }
    return Promise.resolve();
  }

  async complete() {
    for (const process of this.processes) {
      process.handleIncomingEnd();
    }
  }

  async handleIncoming(response: unknown) {
    if (
      isDataPacket(response) ||
      isReadyPacket(response) ||
      isEndPacket(response)
    ) {
      const [, procIdx] = response;
      // console.log("in", MessageTypeMark[response[0]], procIdx, response[2]);
      if (!this.processes[procIdx]) {
        throw new Error(
          `Process #${procIdx} has not been initialized. Protocol Error.`
        );
      }
      this.processes[procIdx].handleIncoming(response);
    }
  }
}

type MessageQueueEntry =
  | { type: "value"; value: unknown; ack: () => any }
  | { type: "complete"; ack: () => any };

class Process<Exchange extends AppExchangeScheme, CMD extends keyof Exchange> {
  public active = true;
  private msgQueue = new Array<MessageQueueEntry>();
  private lastMessageAckReceived: null | (() => any) = null;

  constructor(
    private procIdx: number,
    private responses: Observer<Exchange[CMD]["response"]>,
    private validateResponse: Validator<Exchange[CMD]["response"]>,
    private websocket: Observer<ArrayBuffer | string>
  ) {}

  handleOutgoingData(value: Exchange[CMD]["request"]) {
    return new Promise<unknown>(resolve => {
      this.msgQueue.push({ type: "value", value, ack: resolve });
      this.tryPushingOutgoing();
    });
  }

  handleOutgoingReady() {
    const readyPacket: ReadyPacket = [MessageTypeMark.Ready, this.procIdx];
    // console.log("out", "ready", this.procIdx);
    return this.websocket.next(serialize(readyPacket));
  }

  handleOutgoingEnd() {
    return new Promise<unknown>(resolve => {
      this.active = false;
      this.msgQueue.push({ type: "complete", ack: resolve });
      this.tryPushingOutgoing();
    });
  }

  async handleIncoming(response: unknown) {
    if (isDataPacket(response)) {
      await this.handleIncomingData(response);
    } else if (isReadyPacket(response)) {
      await this.handleIncomingReady();
    } else if (isEndPacket(response)) {
      await this.handleIncomingEnd();
    }
  }

  async handleIncomingData(response: DataPacket) {
    const [, , data] = response;
    if (this.validateResponse(data)) {
      await this.responses.next(data);
    } else {
      throw new Error(`Process #${this.procIdx} has received invalid message`);
    }
    this.handleOutgoingReady();
  }

  handleIncomingReady() {
    const { lastMessageAckReceived } = this;
    this.lastMessageAckReceived = null;
    if (lastMessageAckReceived) {
      lastMessageAckReceived();
    }
    this.tryPushingOutgoing();
  }

  handleIncomingEnd() {
    this.active = false;
    this.handleOutgoingReady();
    this.responses.complete();
  }

  tryPushingOutgoing() {
    if (this.msgQueue.length && this.lastMessageAckReceived === null) {
      const message = this.msgQueue.shift()!;

      switch (message.type) {
        case "value":
          const dataPacket: DataPacket = [
            MessageTypeMark.Data,
            this.procIdx,
            message.value
          ];
          this.lastMessageAckReceived = message.ack;
          // console.log("out", "data", this.procIdx, message.value);
          return this.websocket.next(serialize(dataPacket));

        case "complete":
          const endPacket: EndPacket = [MessageTypeMark.End, this.procIdx];
          this.lastMessageAckReceived = message.ack;
          // console.log("out", "end", this.procIdx);
          return this.websocket.next(serialize(endPacket));
      }
    }
  }
}

class ProcessOutgoingComms<
  Exchange extends AppExchangeScheme,
  CMD extends keyof Exchange
> implements Observer<Exchange[CMD]["request"]> {
  get closed() {
    return this.process.active;
  }

  constructor(private process: Process<Exchange, CMD>) {}

  next(value: Exchange[CMD]["request"]) {
    return this.process.handleOutgoingData(value);
  }

  complete() {
    return this.process.handleOutgoingEnd();
  }
}
