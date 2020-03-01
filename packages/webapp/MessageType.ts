import {
  isTuple,
  isNumber,
  isNumberOf,
  isString,
  isAny,
  Validator
} from "@hullo/validate";

export enum MessageTypeMark {
  Start = 1,
  Ready = 2,
  Data = 3,
  End = 4
}

export type StartPacket = [MessageTypeMark.Start, number, string];
export const isStartPacket: Validator<StartPacket> = isTuple(
  isNumberOf(MessageTypeMark.Start),
  isNumber,
  isString
);

export type ReadyPacket = [MessageTypeMark.Ready, number];
export const isReadyPacket: Validator<ReadyPacket> = isTuple(
  isNumberOf(MessageTypeMark.Ready),
  isNumber
);

export type DataPacket = [MessageTypeMark.Data, number, unknown];
export const isDataPacket: Validator<DataPacket> = isTuple(
  isNumberOf(MessageTypeMark.Data),
  isNumber,
  isAny
);

export type EndPacket = [MessageTypeMark.End, number];
export const isEndPacket: Validator<EndPacket> = isTuple(
  isNumberOf(MessageTypeMark.End),
  isNumber
);
