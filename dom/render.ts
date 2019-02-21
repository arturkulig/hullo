import { ElementShape } from "./element";
import { Cancellation, resolve, Task, resolved } from "../future/task";
import { Observable, Observer } from "../stream/observable";
import { then } from "../future/then";
import { future } from "../future/future";
import { pipe } from "../pipe";

export function render(shape: ElementShape) {
  const e = document.createElement(shape.tagName);
  return { element: e, cancel: mold(e, shape) };
}

export function mold(e: HTMLElement, shape: ElementShape) {
  const { attrs, props, events, style, children } = shape;
  const subCancels = new Array<Cancellation>();

  for (const k in attrs) {
    if (!Object.prototype.hasOwnProperty.call(attrs, k)) {
      continue;
    }
    subCancels.push(applyAttr(e, k, attrs[k]));
  }

  for (const k in props) {
    if (!Object.prototype.hasOwnProperty.call(props, k)) {
      continue;
    }
    subCancels.push(applyProp(e, k, props[k]));
  }

  for (const k in events) {
    if (!Object.prototype.hasOwnProperty.call(events, k)) {
      continue;
    }
    subCancels.push(applyEvent(e, k, events[k]));
  }

  for (const k in style) {
    if (!Object.prototype.hasOwnProperty.call(style, k)) {
      continue;
    }
    subCancels.push(applyStyle(e, k as keyof CSSStyleDeclaration, style[k]));
  }

  subCancels.push(applyChildren(e, children));

  return () => {
    subCancels.splice(0).forEach(f => (f !== noop ? f() : undefined));
  };
}

type In<T, N extends keyof T> = T[N];

function applyChildren(e: HTMLElement, childShapes$: ElementShape["children"]) {
  const currentElementList = new Array<{
    shape: ElementShape;
    element: HTMLElement;
    cancel: Cancellation;
  }>();

  return forEach(
    childShapes$,
    nextShapesList => {
      for (
        let i = 0;
        i < Math.max(nextShapesList.length, currentElementList.length);
        i++
      ) {
        if (currentElementList[i] && nextShapesList[i]) {
          if (currentElementList[i].shape === nextShapesList[i]) {
            continue;
          }
          currentElementList[i].cancel();
          const replacement = render(nextShapesList[i]);
          e.replaceChild(currentElementList[i].element, replacement.element);
          currentElementList[i] = { shape: nextShapesList[i], ...replacement };
        } else if (nextShapesList[i]) {
          const addition = render(nextShapesList[i]);
          if (currentElementList[i - 1]) {
            currentElementList[i - 1].element.insertAdjacentElement(
              "afterend",
              addition.element
            );
          } else if (currentElementList[i + 1]) {
            currentElementList[i + 1].element.insertAdjacentElement(
              "beforebegin",
              addition.element
            );
          } else {
            e.appendChild(addition.element);
          }
          currentElementList[i] = { shape: nextShapesList[i], ...addition };
        } else if (currentElementList[i]) {
          e.removeChild(currentElementList[i].element);
          currentElementList[i].cancel();
          currentElementList.splice(i, 1);
        }
      }
    },
    () => {
      currentElementList.splice(0).forEach(_ => {
        e.removeChild(_.element);
        _.cancel();
      });
    }
  );
}

function applyEvent<NAME extends string>(
  e: HTMLElement,
  name: NAME,
  handler: In<ElementShape["events"], NAME>
) {
  if (typeof handler === "function") {
    e.addEventListener(name, handler as (event: Event) => any);
    return () => {
      e.removeEventListener(name, handler as (event: Event) => any);
    };
  } else {
    const observer = handler as Observer<Event>;
    let processing = false;
    let onLastSent = resolve();
    const listener = <T extends Event>(event: T) => {
      if (processing) {
        return;
      }
      processing = true;
      onLastSent = then<void, void>(() => {
        processing = false;
      })(observer.next(event) || resolve());
    };

    e.addEventListener(name, listener);

    return () => {
      e.removeEventListener(name, listener);
      onLastSent(observer.complete);
    };
  }
}

function applyProp<NAME extends string>(
  e: HTMLElement,
  name: NAME,
  value: In<ElementShape["props"], NAME>
) {
  return forEach(value, v => {
    (e as any)[name] = v;
  });
}

function applyStyle<NAME extends keyof CSSStyleDeclaration>(
  e: HTMLElement,
  name: NAME,
  value: ElementShape["style"][NAME]
) {
  return forEach(value, v => {
    e.style[name] = v;
  });
}

function applyAttr<NAME extends string>(
  e: HTMLElement,
  name: NAME,
  value: In<ElementShape["attrs"], NAME>
) {
  return forEach(value, v => {
    if (v == undefined) {
      e.removeAttribute(name);
    } else {
      e.setAttribute(name, v);
    }
  });
}

function forEach<T>(
  streamOrValue: Observable<T> | T,
  next: (v: T) => void,
  complete?: () => void
) {
  if (typeof streamOrValue === "function") {
    return (streamOrValue as Observable<T>)({
      next: singleValue =>
        pipe(
          whenPainted(),
          then(() => next(singleValue))
        ),
      complete: () =>
        complete
          ? pipe(
              whenPainted(),
              then(complete)
            )
          : resolved
    });
  } else {
    next(streamOrValue);
    return noop;
  }
}

let whenPaintedF: null | Task = null;

const whenPainted =
  typeof window === "undefined" || !("requestAnimationFrame" in window)
    ? () =>
        whenPaintedF ||
        (whenPaintedF = future<void>(resolve => {
          whenPaintedF = null;
          setTimeout(resolve, 0);
          return () => {};
        }))
    : () =>
        whenPaintedF ||
        (whenPaintedF = future<void>(resolve => {
          const token = window.requestAnimationFrame(() => {
            whenPaintedF = null;
            resolve();
          });
          return () => {
            window.cancelAnimationFrame(token);
          };
        }));

function noop() {}
