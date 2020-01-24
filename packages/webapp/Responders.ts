import { Duplex } from "@hullo/core/Duplex";
import { Connection } from "./Connection";

export type Responders<Template extends RespondersTemplate> = {
  [id in keyof Template]: Responder<Template[id]["in"], Template[id]["out"]>;
};

export interface RespondersTemplate {
  [command: string]: {
    in: any;
    out: any;
  };
}

export interface Responder<IN = any, OUT = any> {
  (comms: Duplex<IN, OUT>, connection: Connection): any;
}
