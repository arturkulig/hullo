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
    possesions.push(render_event(htmlElement, k, events[k]));
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
  for (let i = 0; i < nextShapes.length; i++) {
    const currentShape = children.shapes[i];
    const currentElement = children.elements[i];
    const currentCancel = children.cancels[i];
    // const currentAbandon = children.abandons[i];
    const nextShape = nextShapes[i];
    // let nextShapePrevPos = -1;

    // element stays on position
    if (currentShape !== undefined && currentShape === nextShape) {
      continue;
    }

    // element exists and should be moved
    // else if (
    //   nextShape !== undefined &&
    //   (nextShapePrevPos = children.shapes.indexOf(nextShape, i)) >= 0
    // ) {
    //   htmlElement.insertBefore(
    //     children.elements[nextShapePrevPos],
    //     children.elements[i]
    //   );

    //   children.shapes.splice(
    //     i,
    //     0,
    //     children.shapes.splice(nextShapePrevPos, 1)[0]
    //   );
    //   children.elements.splice(
    //     i,
    //     0,
    //     children.elements.splice(nextShapePrevPos, 1)[0]
    //   );
    //   children.cancels.splice(
    //     i,
    //     0,
    //     children.cancels.splice(nextShapePrevPos, 1)[0]
    //   );
    //   children.abandons.splice(
    //     i,
    //     0,
    //     children.abandons.splice(nextShapePrevPos, 1)[0]
    //   );
    // }

    //element remains
    else if (currentShape !== undefined) {
      currentCancel(currentElement);

      // element recycling
      if (currentShape.tagName === nextShape.tagName) {
        const { abandon, cancel } = mold(
          currentElement,
          nextShape,
          syncOptions
        );
        children.shapes[i] = nextShape;
        children.abandons[i] = abandon;
        children.cancels[i] = cancel;
      }
      // element replacement
      else {
        const { element, abandon, cancel } = render_internal(
          nextShape,
          syncOptions
        );
        htmlElement.replaceChild(element, currentElement);
        children.shapes[i] = nextShape;
        children.elements[i] = element;
        children.abandons[i] = abandon;
        children.cancels[i] = cancel;
        i--;
      }
    }

    // element adding
    else {
      const { element, abandon, cancel } = render_internal(
        nextShape,
        syncOptions
      );

      let latterElement: HTMLElement | undefined = undefined;
      for (let j = i + 1; j < children.elements.length; j++) {
        if (children.elements[j] !== undefined) {
          latterElement = children.elements[j];
          break;
        }
      }

      if (latterElement) {
        htmlElement.insertBefore(element, latterElement);
      } else {
        htmlElement.appendChild(element);
      }
      children.shapes[i] = nextShape;
      children.elements[i] = element;
      children.abandons[i] = abandon;
      children.cancels[i] = cancel;
    }
  }

  // elements removal
  for (let i = nextShapes.length; i < children.shapes.length; i++) {
    children.abandons[i](children.elements[i]);
    htmlElement.removeChild(children.elements[i]);
  }
  children.shapes.splice(nextShapes.length);
  children.cancels.splice(nextShapes.length);
  children.abandons.splice(nextShapes.length);
  children.elements.splice(nextShapes.length);
}

function render_children_cleanup(
  htmlElement: HTMLElement,
  _syncOptions: SyncMode,
  children: ChildrenRegistry
) {
  children.elements.forEach(render_children_cleanup_removeChild);
  children.abandons.forEach(function render_children_cleanup_each(abandon) {
    abandon(htmlElement);
  });
}

function render_children_cleanup_removeChild(child: HTMLElement) {
  child.parentElement!.removeChild(child);
}

function render_event<NAME extends string>(
  htmlElement: HTMLElement,
  name: NAME,
  handler: In<HulloElement["events"], NAME>
): Possesion {
  if (typeof handler === "function") {
    return render_event_regular<NAME>(htmlElement, name, handler);
  } else {
    return render_event_observer<NAME>(htmlElement, name, handler);
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
  const state = {
    name,
    ...(name in htmlElement ? { defaultValue: (htmlElement as any)[name] } : {})
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
  state: { name: string; defaultValue?: any }
) {
  (htmlElement as any)[state.name] = value;
}

function render_prop_cleanup(
  htmlElement: HTMLElement,
  _syncOptions: SyncMode,
  state: { name: string; defaultValue?: any }
) {
  (htmlElement as any)[state.name] = state.defaultValue;
}

function render_style<NAME extends keyof CSSStyleDeclaration>(
  htmlElement: HTMLElement,
  syncOptions: SyncMode,
  name: NAME,
  value: HulloElement["style"][NAME]
) {
  const state = { name, defaultValue: htmlElement.style[name] };

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
  state: { name: keyof CSSStyleDeclaration; defaultValue: any }
) {
  htmlElement.style[state.name as any] = value;
}

function render_style_cleanup(
  htmlElement: HTMLElement,
  _syncOptions: SyncMode,
  state: { name: keyof CSSStyleDeclaration; defaultValue: any }
) {
  htmlElement.style[state.name as any] = state.defaultValue;
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
    { name, defaultValue },
    render_attr_each,
    render_attr_cleanup
  );
}

function render_attr_each(
  htmlElement: HTMLElement,
  _syncOptions: SyncMode,
  value: any,
  state: { name: string; defaultValue: string | null }
) {
  if (value == null) {
    htmlElement.removeAttribute(state.name);
  } else {
    htmlElement.setAttribute(state.name, value);
  }
}

function render_attr_cleanup(
  htmlElement: HTMLElement,
  _syncOptions: SyncMode,
  state: { name: string; defaultValue: string | null }
) {
  if (state.defaultValue == null) {
    htmlElement.removeAttribute(state.name);
  } else {
    htmlElement.setAttribute(state.name, state.defaultValue);
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
