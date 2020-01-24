import {
  HttpResponse,
  HttpRequest,
  TemplatedApp,
  RecognizedString
} from "uWebSockets.js";
import { Channel, Duplex } from "@hullo/core";
import { RespondersTemplate } from "./Responders";
import { serialize } from "./messagepack";
import { AppConfig } from "./AppConfig";
import {
  getAllHeaders,
  getSessionId,
  getSessionKey,
  messagepackContent,
  jsonContent
} from "./creationUtils";
import * as cookie from "cookie";

export function createHTTPApp<Session, Template extends RespondersTemplate>(
  app: TemplatedApp,
  path: RecognizedString,
  options: AppConfig<Session, Template>
): TemplatedApp {
  return app.post(path, handler).put(path, handler);

  async function handler(res: HttpResponse, req: HttpRequest) {
    const request = await parseContent(
      req.getHeader("content-type"),
      await reduceToSingleBinary(req, res)
    );

    if (!Array.isArray(request)) {
      res.writeStatus("400 Bad request").end();
      return;
    }

    const [command, commandData = undefined] = request;

    if (!command || typeof command !== "string") {
      res.writeStatus("400 Bad request").end();
      return;
    }

    // establish the session
    const sentInId = cookie.parse(req.getHeader("cookie") || "")[
      getSessionKey(options.appName)
    ];
    const id = getSessionId(sentInId);
    if (sentInId != id) {
      res.writeHeader(
        "Set-cookie",
        cookie.serialize(getSessionKey(options.appName), id)
      );
    }

    // set up communication channels

    const in$ = new Channel<unknown>();
    const out$ = new Channel<unknown>();
    const responderComms = new Duplex(in$, out$);

    // set up output sink
    let sent = false;
    out$.subscribe({
      next(message) {
        if (sent) {
          console.error(
            `Controller ${command} wrote after sending a response over HTTP`
          );
          return;
        }
        sent = true;

        try {
          const content = serialize(message);
          res
            .writeStatus("200 OK")
            .writeHeader("Content-type", "application/vnd.messagepack")
            .end(content);
        } catch {
          res.writeStatus("500 Server fault").end();
        }
      }
    });

    // run the controller
    options.responder[command](responderComms, {
      id,
      live: false,
      headers: getAllHeaders(req)
    });
    if (request.length > 1) {
      await in$.next(commandData);
    }
    await in$.complete();
  }
}

export function parseContent(contentType: string, data: ArrayBuffer): unknown {
  switch (true) {
    case contentType === "application/vnd.messagepack" ||
      contentType === "application/vnd.msgpack": {
      return messagepackContent(data);
    }

    case contentType === "application/json": {
      return jsonContent(data);
    }

    default:
      return null;
  }
}

async function reduceToSingleBinary(req: HttpRequest, res: HttpResponse) {
  const dataLength = +(req.getHeader("content-length") || 0);
  const data = await (dataLength
    ? reduceToSingleBinaryKnownLength(res, dataLength)
    : reduceToSingleBinaryUnknownLength(res));
  return data;
}

function reduceToSingleBinaryKnownLength(
  response: HttpResponse,
  length: number
): Promise<ArrayBuffer> {
  const payload = new Uint8Array(length);
  let position = 0;
  return new Promise(resolve => {
    response.onData((chunk: ArrayBuffer, isLast: boolean) => {
      payload.set(new Uint8Array(chunk), position);
      if (isLast) {
        resolve(payload);
      }
    });
  });
}

function reduceToSingleBinaryUnknownLength(
  response: HttpResponse
): Promise<ArrayBuffer> {
  let payload = new Uint8Array(length);
  return new Promise(resolve => {
    response.onData((chunk: ArrayBuffer, isLast: boolean) => {
      payload = concatBytes(payload, new Uint8Array(chunk));
      if (isLast) {
        resolve(payload);
      }
    });
  });
}

function concatBytes(b1: Uint8Array, b2: Uint8Array) {
  const glued = new Uint8Array(b1.byteLength + b2.byteLength);
  glued.set(new Uint8Array(b1), 0);
  glued.set(new Uint8Array(b2), b1.byteLength);
  return glued;
}
