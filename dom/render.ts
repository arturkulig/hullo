import { HulloElement, SyncMode } from "./element";
import { resolve, resolved, then, schedule, Task } from "../task";
import { Observable, Observer } from "../stream/observable";
import { pipe } from "../pipe";

interface RenderCancellation {
  (element: HTMLElement): void;
}

interface Possesion {
  abandon: RenderCancellation;
  cancel: RenderCancellation;
}

export function render(shape: HulloElement) {
  const e = document.createElement(shape.tagName);
  return { element: e, ...mold(e, shape) };
}

function render_internal(shape: HulloElement, inheritedSync: SyncMode) {
  const e = document.createElement(shape.tagName);
  return { element: e, ...mold(e, shape, inheritedSync) };
}

export function mold(
  htmlElement: HTMLElement,
  elementShape: HulloElement,
  inheritedSync?: SyncMode
): Possesion {
  const { attrs, props, events, style, children } = elementShape;
  const syncOptions: SyncMode =
    elementShape.sync || inheritedSync || "immediate";
  const possesions = new Array<Possesion>();

  for (const k in attrs) {
    if (!Object.prototype.hasOwnProperty.call(attrs, k)) {
      continue;
    }
    possesions.push(render_attr(htmlElement, syncOptions, k, attrs[k]));
  }

  for (const k in props) {
    if (!Object.prototype.hasOwnProperty.call(props, k)) {
      continue;
    }
    possesions.push(render_prop(htmlElement, syncOptions, k, props[k]));
  }

  for (const k in events) {
    if (!Object.prototype.hasOwnProperty.call(events, k)) {
      continue;
    }
    const handler = events[k];
    possesions.push(
      typeof handler === "function"
        ? render_event_regular(htmlElement, k, handler)
        : render_event_observer(htmlElement, k, handler)
    );
  }

  for (const k in style) {
    if (!Object.prototype.hasOwnProperty.call(style, k)) {
      continue;
    }
    possesions.push(
      render_style(
        htmlElement,
        syncOptions,
        k as keyof CSSStyleDeclaration,
        style[k]
      )
    );
  }

  possesions.push(render_children(htmlElement, syncOptions, children));

  if (elementShape.ref) {
    elementShape.ref(htmlElement);
  }
  if (elementShape.deref) {
    possesions.push({
      abandon: elementShape.deref,
      cancel: elementShape.deref
    });
  }

  return {
    abandon: function render_mold_abandon() {
      possesions.splice(0).forEach(possesion => possesion.abandon(htmlElement));
    },
    cancel: function render_mold_cancel() {
      possesions.splice(0).forEach(possesion => possesion.cancel(htmlElement));
    }
  };
}

type In<T, N extends keyof T> = T[N];

type ChildrenRegistry = {
  shapes: HulloElement[];
  elements: HTMLElement[];
  abandons: RenderCancellation[];
  cancels: RenderCancellation[];
};

function render_children(
  htmlElement: HTMLElement,
  syncOptions: SyncMode,
  childShapes$: HulloElement["children"]
) {
  const children: ChildrenRegistry = {
    shapes: [],
    elements: [],
    abandons: [],
    cancels: []
  };

  return render_each(
    htmlElement,
    syncOptions,
    childShapes$,
    children,
    render_children_each,
    render_children_cleanup
  );
}

function render_children_each(
  htmlElement: HTMLElement,
  syncOptions: SyncMode,
  nextShapes: Array<HulloElement>,
  children: ChildrenRegistry
) {
  const { shapes, elements, cancels, abandons } = children;

  const nextElements: typeof elements = [];
  const nextCancels: typeof cancels = [];
  const nextAbandons: typeof abandons = [];

  for (let i = 0; i < Math.max(shapes.length, nextShapes.length); i++) {
    const currentShape = shapes[i];
    const currentElement = elements[i];
    const currentCancel = cancels[i];
    const currentAbandon = abandons[i];
    const nextShape = nextShapes[i];
    let nextShapePrevPos = -1;

    // element stays on position
    if (
      i < shapes.length &&
      i < nextShapes.length &&
      currentShape === nextShape
    ) {
      nextElements.push(elements[i]);
      nextCancels.push(cancels[i]);
      nextAbandons.push(abandons[i]);
    }

    // element exists and should be moved
    else if (
      i < nextShapes.length &&
      (nextShapePrevPos = shapes.indexOf(nextShape)) >= 0 &&
      nextShapes.indexOf(nextShape) === i
    ) {
      nextElements.push(elements[nextShapePrevPos]);
      nextCancels.push(cancels[nextShapePrevPos]);
      nextAbandons.push(abandons[nextShapePrevPos]);
    }

    //element remains
    else if (i < shapes.length && i < nextShapes.length) {
      currentCancel(currentElement);

      const { element, abandon, cancel } =
        currentShape.tagName === nextShape.tagName
          ? {
              element: currentElement,
              ...mold(currentElement, nextShape, syncOptions)
            }
          : render_internal(nextShape, syncOptions);

      nextElements.push(element);
      nextAbandons.push(abandon);
      nextCancels.push(cancel);
    }

    // element adding
    else if (i < nextShapes.length) {
      const { element, abandon, cancel } = render_internal(
        nextShape,
        syncOptions
      );
      nextElements.push(element);
      nextAbandons.push(abandon);
      nextCancels.push(cancel);
    }

    //
    else if (i < shapes.length) {
      currentAbandon(currentElement);
    }
  }

  // diff
  let leftI = 0;
  let rightI = 0;
  while (leftI < elements.length && rightI < nextElements.length) {
    const leftLength = elements.length;
    const rightLength = nextElements.length;

    const current = elements[leftI];
    const next = nextElements[rightI];

    if (current === next) {
      leftI++;
      rightI++;
      continue;
    }

    const currentInNext = nextElements.indexOf(current, rightI);
    if (currentInNext < 0) {
      htmlElement.removeChild(current);
      leftI++;
      continue;
    }

    const nextInCurrent = elements.indexOf(next, leftI);
    if (nextInCurrent < 0) {
      if (leftI < leftLength) {
        htmlElement.insertBefore(next, elements[leftI]);
      } else {
        htmlElement.appendChild(next);
      }
      rightI++;
      continue;
    }

    let leftStableLength = 0;
    for (
      let distance = 0,
        max = Math.min(rightLength - currentInNext, leftLength - leftI);
      distance < max;
      distance++
    ) {
      if (
        elements[leftI + distance] === nextElements[currentInNext + distance]
      ) {
        leftStableLength++;
      } else {
        break;
      }
    }
    let leftStaysBenefit = rightI - currentInNext + leftStableLength;

    let rightStableLength = 0;
    for (
      let distance = 0,
        max = Math.min(leftLength - currentInNext, rightLength - rightI);
      distance < max;
      distance++
    ) {
      if (
        elements[rightI + distance] === nextElements[currentInNext + distance]
      ) {
        rightStableLength++;
      } else {
        break;
      }
    }
    let rightStaysBenefit = leftI - currentInNext + rightStableLength;

    if (leftStaysBenefit > rightStaysBenefit && rightStaysBenefit > 0) {
      for (let i = rightI; i < currentInNext; i++) {
        htmlElement.insertBefore(nextElements[i], current);
      }
      rightI += currentInNext - rightI;

      leftI += leftStableLength;
      rightI += leftStableLength;
    } else if (rightStaysBenefit >= leftStaysBenefit && leftStaysBenefit > 0) {
      for (let i = leftI; i < nextInCurrent; i++) {
        htmlElement.removeChild(elements[i]);
      }
      leftI += nextInCurrent - leftI;

      leftI += rightStableLength;
      rightI += rightStableLength;
    } else {
      htmlElement.replaceChild(next, current);
      leftI++;
      rightI++;
      elements.splice(nextInCurrent, 1);
      shapes.splice(nextInCurrent, 1);
      cancels.splice(nextInCurrent, 1);
      abandons.splice(nextInCurrent, 1);
    }
  }

  for (let i = leftI; i < elements.length; i++) {
    htmlElement.removeChild(elements[i]);
  }

  for (let i = rightI; i < nextElements.length; i++) {
    htmlElement.appendChild(nextElements[i]);
  }

  children.shapes = nextShapes;
  children.elements = nextElements;
  children.cancels = nextCancels;
  children.abandons = nextAbandons;
}

function render_children_cleanup(
  htmlElement: HTMLElement,
  _syncOptions: SyncMode,
  children: ChildrenRegistry
) {
  while (htmlElement.firstChild) {
    htmlElement.removeChild(htmlElement.firstChild);
  }
  for (let i = 0, l = children.abandons.length; i < l; i++) {
    children.abandons[i](children.elements[i]);
  }
}

function render_event_regular<NAME extends string>(
  htmlElement: HTMLElement,
  name: NAME,
  handler: In<HulloElement["events"], NAME>
) {
  htmlElement.addEventListener(name, schedulingEventListener);

  return {
    abandon: noop,
    cancel: function cancelEventListenerApplication() {
      htmlElement.removeEventListener(name, schedulingEventListener);
    }
  };

  function schedulingEventListener(event: Event) {
    schedule(handler as (event: Event) => any, event);
  }
}

function render_event_observer<NAME extends string>(
  htmlElement: HTMLElement,
  name: NAME,
  handler: In<HulloElement["events"], NAME>
) {
  const observer = handler as Observer<Event>;
  let closed = false;
  let processing = false;
  let onLastSent = resolve();

  htmlElement.addEventListener(name, render_event_observer_listener);

  return {
    abandon: render_event_observer_cancel,
    cancel: render_event_observer_cancel
  };

  function render_event_observer_cancel() {
    if (closed) {
      return;
    }
    closed = true;
    htmlElement.removeEventListener(name, render_event_observer_listener);
    onLastSent(observer.complete);
  }

  function render_event_observer_listener<T extends Event>(event: T) {
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
  }
}

function render_prop<NAME extends string>(
  htmlElement: HTMLElement,
  syncOptions: SyncMode,
  name: NAME,
  value: In<HulloElement["props"], NAME>
) {
  const hasDefaultValue = name in htmlElement;
  const defaultValue = hasDefaultValue ? (htmlElement as any)[name] : undefined;
  const state = {
    name,
    hasDefaultValue,
    defaultValue,
    lastValue: defaultValue
  };

  return render_each(
    htmlElement,
    syncOptions,
    value,
    state,
    render_prop_each,
    render_prop_cleanup
  );
}

function render_prop_each(
  htmlElement: HTMLElement,
  _syncOptions: SyncMode,
  value: any,
  state: {
    name: string;
    hasDefaultValue: boolean;
    defaultValue: any;
    lastValue: any;
  }
) {
  if (value !== state.lastValue) {
    state.lastValue = value;
    (htmlElement as any)[state.name] = value;
  }
}

function render_prop_cleanup(
  htmlElement: HTMLElement,
  _syncOptions: SyncMode,
  state: {
    name: string;
    hasDefaultValue: boolean;
    defaultValue: any;
    lastValue: any;
  }
) {
  if (state.hasDefaultValue) {
    if (state.defaultValue !== state.lastValue) {
      (htmlElement as any)[state.name] = state.defaultValue;
    }
  } else {
    if (name in htmlElement) {
      delete (htmlElement as any)[state.name];
    }
  }
}

function render_style<NAME extends keyof CSSStyleDeclaration>(
  htmlElement: HTMLElement,
  syncOptions: SyncMode,
  name: NAME,
  value: HulloElement["style"][NAME]
) {
  const defaultValue = htmlElement.style[name];
  const state = {
    name,
    defaultValue,
    lastValue: defaultValue
  };

  return render_each(
    htmlElement,
    syncOptions,
    value,
    state,
    render_style_each,
    render_style_cleanup
  );
}

function render_style_each(
  htmlElement: HTMLElement,
  _syncOptions: SyncMode,
  value: any,
  state: { name: keyof CSSStyleDeclaration; defaultValue: any; lastValue: any }
) {
  if (value !== state.lastValue) {
    state.lastValue = value;
    htmlElement.style[state.name as any] = value;
  }
}

function render_style_cleanup(
  htmlElement: HTMLElement,
  _syncOptions: SyncMode,
  state: { name: keyof CSSStyleDeclaration; defaultValue: any; lastValue: any }
) {
  if (state.defaultValue !== state.lastValue) {
    htmlElement.style[state.name as any] = state.defaultValue;
  }
}

function render_attr<NAME extends string>(
  htmlElement: HTMLElement,
  syncOptions: SyncMode,
  name: NAME,
  value: In<HulloElement["attrs"], NAME>
) {
  const defaultValue = htmlElement.getAttribute(name);

  return render_each(
    htmlElement,
    syncOptions,
    value,
    { name, defaultValue, lastValue: defaultValue },
    render_attr_each,
    render_attr_cleanup
  );
}

function render_attr_each(
  htmlElement: HTMLElement,
  _syncOptions: SyncMode,
  value: any,
  state: { name: string; defaultValue: string | null; lastValue: string | null }
) {
  if (value !== state.lastValue) {
    state.lastValue = value;
    if (value == null) {
      htmlElement.removeAttribute(state.name);
    } else {
      htmlElement.setAttribute(state.name, value);
    }
  }
}

function render_attr_cleanup(
  htmlElement: HTMLElement,
  _syncOptions: SyncMode,
  state: { name: string; defaultValue: string | null; lastValue: string | null }
) {
  if (state.defaultValue !== state.lastValue) {
    if (state.defaultValue == null) {
      htmlElement.removeAttribute(state.name);
    } else {
      htmlElement.setAttribute(state.name, state.defaultValue);
    }
  }
}

function render_each<T, S = {}>(
  htmlElement: HTMLElement,
  syncMode: SyncMode,
  streamOrValue: Observable<T> | T,
  state: S,
  process: (h: HTMLElement, o: SyncMode, v: T, s: S) => void,
  cleanup: (h: HTMLElement, o: SyncMode, s: S) => void
): Possesion {
  if (typeof streamOrValue === "function") {
    const cancel = (streamOrValue as Observable<T>)({
      next: function render_each_value(singleValue) {
        process(htmlElement, syncMode, singleValue, state);
        if (syncMode === "immediate") {
          return resolved;
        }
        return whenPainted();
      },
      complete: cleanup
        ? function render_each_cleanup() {
            cleanup(htmlElement, syncMode, state);
            return resolved;
          }
        : resolve
    });
    return {
      abandon: cancel,
      cancel: () => {
        cleanup(htmlElement, syncMode, state);
        cancel();
      }
    };
  } else {
    process(htmlElement, syncMode, streamOrValue, state);
    return {
      abandon: noop,
      cancel: () => cleanup(htmlElement, syncMode, state)
    };
  }
}

const whenPaintedCbs: Array<(v: void) => void> = [];
let whenPaintedTask: null | Task = null;

const whenPainted: () => Task =
  typeof window === "undefined" || !("requestAnimationFrame" in window)
    ? function getWhenPainted() {
        return (
          whenPaintedTask ||
          (whenPaintedTask = function whenPainter_timeout(resolve) {
            if (whenPaintedCbs.length === 0) {
              setTimeout(flushWhenPaintedCbs, 0);
            }
            whenPaintedCbs.push(resolve);
            return function whenPainter_cancel() {
              const pos = whenPaintedCbs.indexOf(resolve);
              if (pos >= 0) {
                whenPaintedCbs.splice(pos, 1);
              }
            };
          })
        );
      }
    : function getWhenPainted() {
        return (
          whenPaintedTask ||
          (whenPaintedTask = function whenPainted_raf(resolve) {
            if (whenPaintedCbs.length === 0) {
              window.requestAnimationFrame(flushWhenPaintedCbs);
            }
            whenPaintedCbs.push(resolve);
            return function whenPainter_cancel() {
              const pos = whenPaintedCbs.indexOf(resolve);
              if (pos >= 0) {
                whenPaintedCbs.splice(pos, 1);
              }
            };
          })
        );
      };

function flushWhenPaintedCbs() {
  schedule(flushWhenPaintedCbsI);
}

function flushWhenPaintedCbsI() {
  whenPaintedCbs.splice(0).forEach(call);
}

function call(f: (v: void) => void) {
  f();
}

function noop() {}
