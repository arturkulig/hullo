import { Server, ServerOptions, Data } from "ws";
import { observable, duplex, Duplex, AsyncObserver } from "../core";
import { subject } from "../op/subject";
import { buffer } from "../op/buffer";

export interface WebsocketConnection {
  id: number;
  ip: string | undefined;
  io: Duplex<ArrayBufferLike, ArrayBufferLike>;
}

export function websocketServer(opts: ServerOptions) {
  return subject(
    buffer(
      observable<WebsocketConnection>(connectionsObserver => {
        const server = new Server(opts);

        let lastID = 0;

        server.on("connection", (socket, request) => {
          let lastMessageSent = Promise.resolve();

          const in$ = subject(
            buffer(
              observable<ArrayBufferLike>(incomingMessageObserver => {
                socket.binaryType = "arraybuffer";
                socket.on("message", onMessage);
                socket.on("error", incomingMessageObserver.error);
                socket.on("close", incomingMessageObserver.complete);
                socket.on("ping", onPing);

                return () => {
                  socket.off("message", onMessage);
                  socket.off("error", incomingMessageObserver.error);
                  socket.off("close", incomingMessageObserver.complete);
                  socket.off("ping", onPing);
                };

                function onMessage(msg: Data) {
                  incomingMessageObserver.next(
                    msg instanceof Buffer
                      ? bufferToArrayBuffer(msg)
                      : msg instanceof Array
                        ? bufferToArrayBuffer(Buffer.concat(msg))
                        : typeof msg === "string"
                          ? bufferToArrayBuffer(Buffer.from(msg, "utf-8"))
                          : msg
                  );
                }

                function onPing() {
                  if (!incomingMessageObserver.closed) {
                    socket.pong();
                  }
                }
              })
            )
          );

          const out$: AsyncObserver<ArrayBufferLike> = {
            get closed() {
              return false;
            },
            async next(value) {
              await lastMessageSent;
              await (lastMessageSent = new Promise((resolve, reject) =>
                socket.send(value, { binary: true }, err => {
                  if (err) {
                    reject(err);
                  } else {
                    resolve();
                  }
                })
              ));
            },
            async error() {},
            async complete() {
              await lastMessageSent;
              socket.close();
            }
          };

          connectionsObserver.next({
            id: lastID++,
            ip: request.socket.remoteAddress,
            io: duplex(out$, in$)
          });
        });

        server.on("error", connectionsObserver.error);

        return () => {
          server.close();
        };
      })
    )
  );
}

function bufferToArrayBuffer(buf: Buffer): ArrayBufferLike {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}
