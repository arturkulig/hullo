import { ElementShape } from "./element";
import { Cancellation, resolve, resolved } from "../future/task";
import { Observable, Observer } from "../stream/observable";
import { then } from "../future/then";
import { pipe } from "../pipe";
import { schedule } from "../future";

interface Possesion {
  abandon: Cancellation;
  cancel: Cancellation;
}

export function render(shape: ElementShape) {
  const e = document.createElement(shape.tagName);
  return { element: e, ...mold(e, shape) };
}

export function mold(e: HTMLElement, shape: ElementShape): Possesion {
  const { attrs, props, events, style, children } = shape;
  const possesions = new Array<Possesion>();

  for (const k in attrs) {
    if (!Object.prototype.hasOwnProperty.call(attrs, k)) {
      continue;
    }
    possesions.push(render_attr(e, k, attrs[k]));
  }

  for (const k in props) {
    if (!Object.prototype.hasOwnProperty.call(props, k)) {
      continue;
    }
    possesions.push(render_prop(e, k, props[k]));
  }

  for (const k in events) {
    if (!Object.prototype.hasOwnProperty.call(events, k)) {
      continue;
    }
    possesions.push(render_event(e, k, events[k]));
  }

  for (const k in style) {
    if (!Object.prototype.hasOwnProperty.call(style, k)) {
      continue;
    }
    possesions.push(render_style(e, k as keyof CSSStyleDeclaration, style[k]));
  }

  possesions.push(render_children(e, children));

  return {
    abandon: () => {
      possesions.splice(0).forEach(possesion => possesion.abandon());
    },
    cancel: () => {
      possesions.splice(0).forEach(possesion => possesion.cancel());
    }
  };
}

type In<T, N extends keyof T> = T[N];

function render_children(
  e: HTMLElement,
  childShapes$: ElementShape["children"]
) {
  const childrenRegistry = new Array<
    | {
        shape: ElementShape;
        element: HTMLElement;
        abandon: Cancellation;
        cancel: Cancellation;
      }
    | undefined
  >();

  return render_each(
    childShapes$,
    function render_applyChildren_onNewList(nextShapesList) {
      const length = Math.max(nextShapesList.length, childrenRegistry.length);

      for (let i = 0; i < length; i++) {
        const current = childrenRegistry[i];
        const nextShape = nextShapesList[i];
        if (current && nextShape) {
          if (current.shape === nextShape) {
            continue;
          }
          current.cancel();
          if (current.shape.tagName === nextShape.tagName) {
            childrenRegistry[i] = {
              shape: nextShape,
              element: current.element,
              ...mold(current.element, nextShape)
            };
          } else {
            const replacement = render(nextShape);
            e.replaceChild(replacement.element, current.element);
            childrenRegistry[i] = {
              shape: nextShape,
              ...replacement
            };
          }
        } else if (nextShape) {
          const addition = render(nextShape);
          // const currentBefore = childrenRegistry[i - 1];
          const currentAfter = childrenRegistry[i + 1];
          if (currentAfter) {
            e.insertBefore(addition.element, currentAfter.element);
          } else {
            e.appendChild(addition.element);
          }
          childrenRegistry[i] = { shape: nextShape, ...addition };
        } else if (current) {
          e.removeChild(current.element);
          childrenRegistry[i] = undefined;
          current.abandon();
        }
      }
    },
    () => {
      childrenRegistry.splice(0).forEach(childEntry => {
        if (childEntry) {
          e.removeChild(childEntry.element);
          childEntry.cancel();
        }
      });
    }
  );
}

function render_event<NAME extends string>(
  e: HTMLElement,
  name: NAME,
  handler: In<ElementShape["events"], NAME>
): Possesion {
  function schedulingEventListener(event: Event) {
    schedule(handler as (event: Event) => any, event);
  }

  if (typeof handler === "function") {
    e.addEventListener(name, schedulingEventListener);
    return {
      abandon: noop,
      cancel: function cancelEventListenerApplication() {
        e.removeEventListener(name, schedulingEventListener);
      }
    };
  } else {
    const observer = handler as Observer<Event>;
    let closed = false;
    let processing = false;
    let onLastSent = resolve();

    const listener = <T extends Event>(event: T) => {
      if (closed || processing) {
        return;
      }
      processing = true;
      onLastSent = pipe(
        observer.next(event) || resolve(),
        then<void, void>(() => {
          processing = false;
        })
      );
    };
    e.addEventListener(name, listener);

    const cancel = () => {
      if (closed) {
        return;
      }
      closed = true;
      e.removeEventListener(name, listener);
      onLastSent(observer.complete);
    };
    return {
      abandon: cancel,
      cancel
    };
  }
}

function render_prop<NAME extends string>(
  e: HTMLElement,
  name: NAME,
  value: In<ElementShape["props"], NAME>
) {
  const defaultValue = name in e ? (e as any)[name] : undefined;

  return render_each(
    value,
    v => {
      (e as any)[name] = v;
    },
    () => {
      (e as any)[name] = defaultValue;
    }
  );
}

function render_style<NAME extends keyof CSSStyleDeclaration>(
  e: HTMLElement,
  name: NAME,
  value: ElementShape["style"][NAME]
) {
  return render_each(
    value,
    v => {
      e.style[name] = v;
    },
    () => {
      e.style[name] = undefined;
    }
  );
}

function render_attr<NAME extends string>(
  e: HTMLElement,
  name: NAME,
  value: In<ElementShape["attrs"], NAME>
) {
  return render_each(
    value,
    v => {
      if (v == undefined) {
        e.removeAttribute(name);
      } else {
        e.setAttribute(name, v);
      }
    },
    () => {
      e.removeAttribute(name);
    }
  );
}

function render_each<T>(
  streamOrValue: Observable<T> | T,
  process: (v: T) => void,
  cleanup: () => void
): Possesion {
  if (typeof streamOrValue === "function") {
    const cancel = (streamOrValue as Observable<T>)({
      next: function processRenderValue(singleValue) {
        process(singleValue);
        return resolved;
        // return whenPainted();
      },
      complete: function processRenderCompletion() {
        if (cleanup) {
          cleanup();
          return resolved;
          // return whenPainted();
        }
        return resolved;
      }
    });
    return {
      abandon: cancel,
      cancel: () => {
        cleanup();
        cancel();
      }
    };
  } else {
    process(streamOrValue);
    return {
      abandon: noop,
      cancel: cleanup
    };
  }
}

// let whenPaintedF: null | Task = null;

// const whenPainted =
//   typeof window === "undefined" || !("requestAnimationFrame" in window)
//     ? () =>
//         whenPaintedF ||
//         (whenPaintedF = future<void>(resolve => {
//           whenPaintedF = null;
//           setTimeout(resolve, 0);
//           return () => {};
//         }))
//     : () =>
//         whenPaintedF ||
//         (whenPaintedF = future<void>(resolve => {
//           const token = window.requestAnimationFrame(() => {
//             whenPaintedF = null;
//             resolve();
//           });
//           return () => {
//             window.cancelAnimationFrame(token);
//           };
//         }));

function noop() {}
