import { pipe } from "../../pipe";
import { Cancellation } from "../../future";
import {
  interval,
  map,
  subject,
  Observable,
  observable,
  atom,
  combineLatest
} from "../../stream";
import { html, ElementShape, mount } from "../../dom";

const rootElement = document.createElement("div");
document.body.appendChild(rootElement);
rootElement.title = "mount";

const targetSize = 25;
const startTime = Date.now();

function App() {
  return html.div({
    style: {
      position: "absolute",
      transformOrigin: "0 0",
      left: "50%",
      top: "50%",
      width: "10px",
      height: "10px",
      background: "#eee",
      transform: pipe(
        observable<void>(observer => {
          let currentSending: null | Cancellation = null;
          function send() {
            currentSending = observer.next()(send);
          }
          send();
          return () => {
            if (currentSending) {
              currentSending();
            }
          };
        }),
        map(
          (): string => {
            const t = ((Date.now() - startTime) / 1000) % 10;
            const scale = 1 + (t > 5 ? 10 - t : t) / 10;
            return `scaleX(${scale / 2.5}) scaleY(0.7) translateZ(0.1px)`;
          }
        )
      )
    },
    children: SierpinskiTriangle({
      x: 0,
      y: 0,
      size: 1000,
      text: pipe(
        interval(1000),
        map(t => Math.round(((t - startTime) / 1000) % 10).toString(10)),
        subject
      )
    })
  });
}

function SierpinskiTriangle(props: {
  x: number;
  y: number;
  size: number;
  text: Observable<string>;
}): ElementShape[] {
  if (props.size <= targetSize) {
    return [
      Dot({
        x: props.x - targetSize / 2,
        y: props.y - targetSize / 2,
        size: targetSize,
        text: props.text
      })
    ];
  }
  return [
    ...SierpinskiTriangle({
      x: props.x,
      y: props.y - props.size / 4,
      size: props.size / 2,
      text: props.text
    }),
    ...SierpinskiTriangle({
      x: props.x - props.size / 2,
      y: props.y + props.size / 4,
      size: props.size / 2,
      text: props.text
    }),
    ...SierpinskiTriangle({
      x: props.x + props.size / 2,
      y: props.y + props.size / 4,
      size: props.size / 2,
      text: props.text
    })
  ];
}

function Dot(data: {
  x: number;
  y: number;
  size: number;
  text: Observable<string>;
}) {
  const hover$ = atom(false);

  return html.div({
    events: {
      mouseover: () => {
        hover$.next(true);
      },
      mouseout: () => {
        hover$.next(false);
      }
    },
    style: {
      position: "absolute",
      font: "normal 15px sans-serif",
      textAlign: "center",
      cursor: "pointer",
      width: `${data.size}px`,
      height: `${data.size}px`,
      left: `${data.x}px`,
      top: `${data.y}px`,
      borderRadius: `${data.size / 2}px`,
      lineHeight: `${data.size}px`,
      background: pipe(
        hover$,
        map(hover => (hover ? "#ff0" : "#61dafb"))
      )
    },
    props: {
      innerText: pipe(
        combineLatest<[boolean, string]>([hover$, data.text]),
        map(([hover = false, text = ""]) => (hover ? `*${text}*` : text))
      )
    }
  });
}

const stop = mount(rootElement, App());

declare global {
  interface NodeModule {
    hot: any;
  }
}

if ("hot" in module && module.hot) {
  module.hot.dispose(() => {
    document.body.removeChild(rootElement);
    stop();
  });
}
