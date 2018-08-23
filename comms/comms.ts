import {
  observable,
  subscribe,
  channel,
  duplex,
  Duplex,
  AsyncObserver
} from "../core";
import { subject } from "../op/subject";
import { buffer } from "../op/buffer";

export type CommsOpeningPacket = [number];
export type CommsClosingPacket = [number, true];
export type CommsMessagePacket<T> = [number, false, T];
export type CommsPacket<T> =
  | CommsOpeningPacket
  | CommsClosingPacket
  | CommsMessagePacket<T>;

export enum Oddity {
  even,
  odd
}

export interface Comms<OUT, IN> {
  incoming: AsyncIterable<Duplex<OUT, IN>>;
  open(): Duplex<OUT, IN>;
  close(): void;
}

export function comms<OUT, IN>(
  connection: Duplex<CommsPacket<OUT>, CommsPacket<IN>>,
  oddity: Oddity
): Comms<OUT, IN> {
  const incomingByID: { [id: string]: AsyncObserver<IN> } = {};
  let maxID = 0;

  const connectionSub = subscribe(connection, {
    next(packet) {
      if (
        !(packet instanceof Array) ||
        (packet as any).length === 0 ||
        (packet as any).length > 3
      ) {
        return;
      }

      if (typeof packet[0] !== "number") {
        return;
      }

      maxID = Math.max(maxID, packet[0]);
      if (packet.length === 1 && !incomingByID[packet[0]]) {
        const comm = establish(packet[0]);
        if (incomingObserver) {
          return incomingObserver.next(comm);
        }
      }

      if (typeof packet[1] !== "boolean") {
        return;
      }
      if (packet.length === 2) {
        return incomingByID[packet[0]].complete();
      }
      if (packet.length === 3) {
        return incomingByID[packet[0]].next(packet[2]);
      }
    }
  });

  let incomingObserver: AsyncObserver<Duplex<any, any>> | null = null;
  const incoming = subject(
    buffer(
      observable<Duplex<OUT, IN>>(observer => {
        incomingObserver = observer;

        return () => {
          incomingObserver = null;
        };
      })
    )
  );

  return {
    incoming,
    close,
    open
  };

  function close() {
    if (!connectionSub.closed) {
      connectionSub.unsubscribe();
    }
  }

  function open() {
    const nextID =
      maxID +
      ((maxID % 2 && oddity === Oddity.even) ||
      (!(maxID % 2) && oddity === Oddity.odd)
        ? 2
        : 1);
    maxID = nextID;
    const comms = establish(nextID);
    connection.next([nextID]);
    return comms;
  }

  function establish(id: number) {
    const in$ = channel<IN>();
    const out$ = channel<OUT>();

    incomingByID[id] = in$;

    subscribe(out$, {
      next(value) {
        const packet: [number, false, OUT] = [id, false, value];
        return connection.next(packet);
      },
      error(error) {
        delete incomingByID[id];
        if (in$ && !in$.closed) {
          return in$.error(error);
        }
      },
      async complete() {
        const packet: [number, true] = [id, true];
        await connection.next(packet);

        delete incomingByID[id];
        if (in$ && !in$.closed) {
          return in$.complete();
        }
      }
    });

    return duplex<OUT, IN>(out$, in$);
  }
}
