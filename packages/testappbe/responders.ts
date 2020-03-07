import { Responders } from "@hullo/webapp";
import { toHex, ToHexExchange } from "./responders/toHex";

export type TestExchange = {
  toHex: ToHexExchange;
};

export const responders: Responders<unknown, TestExchange> = {
  toHex
};
