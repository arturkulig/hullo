import { Atom } from "@hullo/core/Atom";
import { Duplex } from "@hullo/core/Duplex";
import { Validator } from "@hullo/validate";

export interface AppExchangeScheme {
  [command: string]: ResponderExchangeScheme;
}
export interface ResponderExchangeScheme {
  request: any;
  response: any;
}

export interface TransportConnection<SessionData> {
  readonly sessionData$: Atom<SessionData>;
  readonly io$: Duplex<unknown, unknown>;
  readonly id: number;
}

export interface WebAppLike<SessionData> {
  createSession(id: number): SessionData;
  handleConnection(connection: TransportConnection<SessionData>): void;
}

export type Responders<SessionData, Exchange extends AppExchangeScheme> = {
  [id in keyof Exchange]: Responder<SessionData, Exchange[id]>;
};

export interface Responder<
  SessionData,
  Exchange extends ResponderExchangeScheme
> {
  validate?: Validator<Exchange["request"]>;
  respond(
    comms: Duplex<Exchange["response"], Exchange["request"]>,
    sessionData: Atom<SessionData>
  ): any;
}
