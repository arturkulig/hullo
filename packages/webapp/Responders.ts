import { Duplex } from "@hullo/core/Duplex";
import { Atom } from "@hullo/core/Atom";
import { Validator } from "@hullo/validate";
import { DTOTemplate } from "./DTOTemplate";

export type Responders<SessionData, Template extends DTOTemplate> = {
  [id in keyof Template]: Responder<
    SessionData,
    Template[id]["request"],
    Template[id]["response"]
  >;
};

export interface Responder<SessionData, REQUEST = unknown, RESPONSE = unknown> {
  validate?: Validator<REQUEST>;
  respond(
    comms: Duplex<REQUEST, RESPONSE>,
    sessionData: Atom<SessionData>
  ): any;
}
