import { Atom } from "@hullo/core/Atom";
import { Duplex } from "@hullo/core/Duplex";

export interface WebAppConnection<SessionData> {
  readonly sessionData$: Atom<SessionData>;
  readonly io$: Duplex<unknown, unknown>;
  readonly id: number;
}

export interface WebApp<SessionData> {
  createSession(id: number): SessionData;
  handleConnection(connection: WebAppConnection<SessionData>): void;
}
