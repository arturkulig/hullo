import { deserialize } from "./messagepack";
import { HttpRequest } from "uWebSockets.js";
import { randomBytes } from "crypto";

export function getSessionKey(appName: string) {
  return `${appName}-session`;
}

export function getSessionId(currentId: string) {
  return currentId || randomBytes(24).toString("hex");
}

export function getAllHeaders(req: HttpRequest) {
  const headers: {
    [id: string]: string[];
  } = {};
  req.forEach((k, v) => {
    const header = k.toLowerCase();
    headers[header] = headers[header] || [];
    headers[header].push(v);
  });
  return headers;
}

export function messagepackContent(data: ArrayBuffer): unknown {
  return deserialize(data);
}

export function jsonContent(data: ArrayBuffer): unknown {
  return JSON.parse(new TextDecoder("Payload", { fatal: true }).decode(data));
}
