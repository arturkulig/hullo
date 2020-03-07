import { WebSocket } from "uWebSockets.js";
import { Duplex } from "@hullo/core/Duplex";
import { Channel } from "@hullo/core/Channel";
import { Observer } from "@hullo/core/Observable";
import { Atom } from "@hullo/core/Atom";
import { WebAppLike } from "./types";
import { messagepackContent, jsonContent } from "./utils";
import { serialize } from "@hullo/messagepack";

export class WebSocketServer<SessionData> {
  private socketToConnectionState = new Map<
    WebSocket,
    Connection<SessionData>
  >();
  private lastID = 0;

  constructor(private webApp: WebAppLike<SessionData>, bind = true) {
    if (bind) {
      this.open = this.open.bind(this);
      this.message = this.message.bind(this);
      this.drain = this.drain.bind(this);
      this.close = this.close.bind(this);
    }
  }

  /** Handler for new WebSocket connection. WebSocket is valid from open to close, no errors. */
  open(ws: WebSocket) {
    // establish the session
    const incoming$ = new Channel<unknown>();
    const id = this.lastID++;
    const connection = new Connection<SessionData>(
      id,
      ws,
      new Atom(this.webApp.createSession(id)),
      incoming$
    );
    this.socketToConnectionState.set(ws, connection);

    this.webApp.handleConnection({
      sessionData$: connection.sessionData$,
      io$: new Duplex<unknown, unknown>(
        incoming$,
        new ConnectionOutgoingHandler(connection)
      ),
      id: connection.id
    });
  }

  /** Handler for a WebSocket message. */
  message(ws: WebSocket, message: ArrayBuffer, isBinary: boolean) {
    const connection = this.socketToConnectionState.get(ws)!;
    connection.handleIncomingMessage(message, isBinary);
  }

  /** Handler for when WebSocket backpressure drains. Check ws.getBufferedAmount(). */
  drain(ws: WebSocket) {
    const connection = this.socketToConnectionState.get(ws)!;
    connection.trySendingQueuedMessages();
  }

  /** Handler for close event, no matter if error, timeout or graceful close. You may not use WebSocket after this event. */
  close(ws: WebSocket) {
    const state = this.socketToConnectionState.get(ws)!;
    state.handleIncomingClosure();
    this.socketToConnectionState.delete(ws);
  }
}

class ConnectionOutgoingHandler<SessionData> implements Observer<unknown> {
  get closed() {
    return !this.connection.active;
  }
  constructor(private connection: Connection<SessionData>) {}
  next(value: unknown) {
    return this.connection.handleOutgoingMessage(value);
  }
  complete() {
    return this.connection.handleOutgoingClosure();
  }
}

type MessageQueueEntry =
  | { type: "complete"; ack: () => any }
  | { type: "data"; data: unknown; ack: () => any };

class Connection<SessionData> {
  public active = true;
  private msgQueue = new Array<MessageQueueEntry>();

  constructor(
    public id: number,
    public ws: WebSocket,
    public sessionData$: Atom<SessionData>,
    public incoming$: Channel<unknown>
  ) {}

  handleIncomingMessage(data: ArrayBuffer, isBinary: boolean) {
    this.incoming$.next((isBinary ? messagepackContent : jsonContent)(data));
  }

  handleIncomingClosure() {
    this.active = false;
    this.incoming$.complete();
    this.msgQueue.splice(0);
    this.sessionData$.complete();
  }

  handleOutgoingMessage(data: unknown) {
    return new Promise(resolve => {
      this.msgQueue.push({
        type: "data",
        data,
        ack: resolve
      });
      this.trySendingQueuedMessages();
    });
  }

  handleOutgoingClosure() {
    return new Promise(resolve => {
      this.msgQueue.push({ type: "complete", ack: resolve });
      this.trySendingQueuedMessages();
    });
  }

  public trySendingQueuedMessages() {
    while (this.msgQueue.length) {
      if (this.ws.getBufferedAmount() !== 0) {
        return;
      }
      const messageQueueEntry = this.msgQueue.shift()!;
      switch (messageQueueEntry.type) {
        case "data":
          this.ws.send(serialize(messageQueueEntry.data), true, false);
          messageQueueEntry.ack();
          break;

        case "complete":
          this.ws.close();
          messageQueueEntry.ack();
          break;
      }
    }
  }
}
