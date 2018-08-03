import { Server, ServerOptions, Data } from "ws";
import { observable } from "../core/streams/observable";
import { subject } from "../op/subject";
import { buffer } from "../op/buffer";
import { duplex, Duplex } from "../core/streams/duplex";

export interface WebsocketConnection {
  id: number;
  ip: string | undefined;
  io: Duplex<Data, Data>;
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
              observable<Data>(incomingMessageObserver => {
                socket.on("message", incomingMessageObserver.next);
                socket.on("error", incomingMessageObserver.error);
                socket.on("close", incomingMessageObserver.complete);
              })
            )
          );

          const out$ = {
            get closed() {
              return false;
            },
            async next(value: Data) {
              await lastMessageSent;
              await (lastMessageSent = new Promise((resolve, reject) =>
                socket.send(value, err => {
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

        server.on("error", err => {
          console.error("Websocket server error:");
          console.error(err);
        });

        return () => {
          server.close();
        };
      })
    )
  );
}
