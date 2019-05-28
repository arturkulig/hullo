import { ofMessagePort, MessagePortDuplex } from "./ofMessagePort";

type Context = { window: Window } | { worker: Worker };

export function interconnect<
  CHS extends { [id: string]: { in: any; out: any } } = {
    [id: string]: { in: any; out: any };
  }
>(self: Window | Worker, contexts?: { [id: string]: Context }) {
  const othersInt: {
    [id in keyof CHS]?: MessagePortDuplex<CHS[id]["in"], CHS[id]["out"]>
  } = {};
  const othersOrders: {
    [id in keyof CHS]?: Array<
      (mpd: MessagePortDuplex<CHS[id]["in"], CHS[id]["out"]>) => any
    >
  } = {};

  self.addEventListener("message", event => {
    if ("data" in event) {
      const { data } = event as { data: any };
      if (data && typeof data === "object" && "type" in data) {
        switch (data.type) {
          case "bridge:create":
            const { to, port } = data as { to: string; port: MessagePort };
            const messagePortDuplex = ofMessagePort(port);
            othersInt[to] = messagePortDuplex;
            const orders = othersOrders[to];
            if (orders) {
              for (const receive of orders) {
                receive(messagePortDuplex);
              }
            }
            port.start();
            break;
        }
      }
    }
  });

  if (contexts) {
    const names = Object.keys(contexts);
    for (let fromIdx = 0; fromIdx < names.length; fromIdx++) {
      for (let toIdx = fromIdx + 1; toIdx < names.length; toIdx++) {
        const mch = new MessageChannel();
        const fromContext = contexts[names[fromIdx]];
        if ("window" in fromContext) {
          fromContext.window.postMessage(
            { type: "bridge:create", to: names[toIdx], port: mch.port1 },
            "*",
            [mch.port1]
          );
        }
        if ("worker" in fromContext) {
          fromContext.worker.postMessage(
            { type: "bridge:create", to: names[toIdx], port: mch.port1 },
            [mch.port1]
          );
        }
        const toContext = contexts[names[toIdx]];
        if ("window" in toContext) {
          toContext.window.postMessage(
            { type: "bridge:create", to: names[fromIdx], port: mch.port2 },
            "*",
            [mch.port2]
          );
        }
        if ("worker" in toContext) {
          toContext.worker.postMessage(
            { type: "bridge:create", to: names[fromIdx], port: mch.port2 },
            [mch.port2]
          );
        }
      }
    }
  }

  return function getContextDuplex<N extends keyof CHS>(name: N) {
    if (othersInt[name]) {
      return Promise.resolve(othersInt[name]!);
    }
    return new Promise<MessagePortDuplex<CHS[N]["in"], CHS[N]["out"]>>(
      resolve => {
        const orders = (othersOrders[name] || []) as (Array<
          (mpd: MessagePortDuplex<CHS[N]["in"], CHS[N]["out"]>) => any
        >);
        othersOrders[name] = orders;
        orders.push(resolve);
      }
    );
  };
}
