import { mount, html } from "@hullo/dom";
import {
  Channel,
  Atom,
  map,
  mapAsync,
  timeout,
  droppingBuffer
} from "@hullo/core";
import { WebAppBrowserClient } from "@hullo/webappclient";
import { isString } from "@hullo/validate";
import { TestExchange } from "../testappbe/responders";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

if (document.getElementById("root")) {
  mount(document.getElementById("root")!, App());
} else {
  console.error("No root");
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function App() {
  const backend = new WebAppBrowserClient<TestExchange>(
    new WebSocket("ws://localhost:8000/ws"),
    {
      toHex: isString
    }
  );
  const toHex$ = backend.spawn("toHex");

  const inputEvent$ = new Channel<InputEvent>();
  const value$ = new Atom<string>("0");

  inputEvent$
    .pipe(map(event => (event.target as HTMLInputElement).value))
    .pipe(droppingBuffer(1))
    .subscribe(value$);

  value$.pipe(map(Number)).subscribe(toHex$);

  return html.div([
    html.input({ props: { value: value$ }, events: { input: inputEvent$ } }),
    html.div({ props: { textContent: toHex$ } }),
    html.div({
      props: {
        textContent: toHex$.pipe(
          mapAsync(async v => {
            await timeout(1000);
            return v;
          })
        )
      }
    })
  ]);
}
