import { duplex, observable } from "../core";
import { subject } from "../op/subject";
import { buffer } from "../op/buffer";

export function websocketBrowserClient(
  url: string,
  protocols?: string | string[] | undefined
) {
  const ws = new WebSocket(url, protocols);
  return duplex(
    {
      get closed() {
        return ws.readyState === 2;
      },
      async next(v: string | ArrayBufferLike | Blob | ArrayBufferView) {
        ws.send(v);
      },
      async error() {
        ws.close();
      },
      async complete() {
        ws.close();
      }
    },
    subject(
      buffer(
        observable<ArrayBuffer>(observer => {
          ws.onmessage = msg => {
            const fr = new FileReader();
            fr.onload = () => {
              if (fr.readyState === 2 && fr.result) {
                if (fr.result instanceof ArrayBuffer) {
                  observer.next(fr.result);
                }
              }
            };
            fr.readAsArrayBuffer(msg.data);
          };
        })
      )
    )
  );
}
