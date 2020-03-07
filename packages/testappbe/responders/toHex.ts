import { Responder } from "@hullo/webapp";
import { isNumber } from "@hullo/validate";
// import { timeout } from "@hullo/core";

export interface ToHexExchange {
  request: number;
  response: string;
}
export const toHex: Responder<unknown, ToHexExchange> = {
  validate: isNumber,
  respond(comms) {
    comms.subscribe({
      async next(n) {
        // await timeout(4000);
        comms.next(n.toString(16));
      }
    });
  }
};
