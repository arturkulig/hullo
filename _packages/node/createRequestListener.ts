import {
  RequestListener,
  IncomingHttpHeaders,
  OutgoingHttpHeaders
} from "http";
import { Observable } from "@hullo/core/Observable";
import { ofReadableStream } from "./ofReadableStream";
import { of } from "@hullo/core/of";
import { ofWritableStream } from "./ofWritableStream";

export function createRequestListener(
  userRequestListener: HTTPRequestListener
): RequestListener {
  return async function requestListener(req, res) {
    if (!req.url || !req.method) {
      return;
    }

    const response = await userRequestListener({
      url: req.url,
      method: req.method,
      headers: req.headers,
      raw: !!({ POST: true, PUT: true } as { [id: string]: boolean })[
        req.method
      ]
        ? ofReadableStream(req)
        : of<ArrayBuffer | string>([])
    });

    res.writeHead(response.status, response.headers);
    if (!response.body) {
      res.end();
    } else {
      response.body.subscribe(ofWritableStream(res));
    }
  };
}

interface HTTPRequestListener {
  (request: HTTPRequest): HTTPResponse | Promise<HTTPResponse>;
}

interface HTTPRequest {
  headers: IncomingHttpHeaders;
  method: string;
  url: string;
  raw: Observable<ArrayBuffer | string>;
}

interface HTTPResponse {
  status: number;
  body?: Observable<ArrayBuffer | string>;
  headers: OutgoingHttpHeaders;
}
