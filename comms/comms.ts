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

export type OpeningPacket = [number];
export type ClosingPacket = [number, true];
export type MessagePacket<T> = [number, false, T];
export type SplitPacket<T> = OpeningPacket | ClosingPacket | MessagePacket<T>;

export enum Oddity {
  even,
  odd
}

export function splitToChannels<OUT, IN>(
  chnls: Duplex<SplitPacket<OUT>, SplitPacket<IN>>,
  oddity: Oddity
) {
  const incomingByID: { [id: string]: AsyncObserver<IN> } = {};
  let maxID = 0;

  const incoming$ = buffer(
    subject(
      observable<Duplex<OUT, IN>>(observer => {
        const inSub = subscribe(chnls, {
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
              return observer.next(openComms(packet[0]));
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

        return () => {
          if (!inSub.closed) {
            inSub.unsubscribe();
          }
        };
      })
    )
  );

  return {
    incoming$,
    open
  };

  function open() {
    const nextID =
      maxID +
      ((maxID % 2 && oddity === Oddity.even) ||
      (!(maxID % 2) && oddity === Oddity.odd)
        ? 2
        : 1);
    maxID = nextID;
    const comms = openComms(nextID);
    chnls.next([nextID]);
    return comms;
  }

  function openComms(id: number) {
    const in$ = channel<IN>();
    incomingByID[id] = in$;

    const out$ = channel<OUT>();

    subscribe(out$, {
      next(value) {
        const packet: [number, false, OUT] = [id, false, value];
        return chnls.next(packet);
      },
      error(error) {
        const in$ = incomingByID[id];
        delete incomingByID[id];
        if (in$ && !in$.closed) {
          return in$.error(error);
        }
      },
      complete() {
        const packet: [number, true] = [id, true];
        chnls.next(packet).then;

        const in$ = incomingByID[id];
        delete incomingByID[id];
        if (in$ && !in$.closed) {
          return in$.complete();
        }
      }
    });

    return duplex<OUT, IN>(out$, in$);
  }
}
