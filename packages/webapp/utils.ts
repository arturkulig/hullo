import { deserialize } from "@hullo/messagepack";

export function messagepackContent(data: ArrayBuffer): unknown {
  return deserialize(data);
}

export function jsonContent(data: ArrayBuffer): unknown {
  return JSON.parse(new TextDecoder("Payload", { fatal: true }).decode(data));
}
