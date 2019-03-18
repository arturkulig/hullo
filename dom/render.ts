import { HulloElement, SyncOptions } from "./element";
import { Cancellation, resolve, resolved, then, schedule, Task } from "../task";
import { Observable, Observer } from "../stream/observable";
import { pipe } from "../pipe";

interface Possesion {
  abandon: Cancellation;
  cancel: Cancellation;
}

export function render(shape: HulloElement) {
  const e = document.createElement(shape.tagName);
  return { element: e, ...mold(e, shape, {}) };
}

function render_internal(shape: HulloElement, inheritedOptions: SyncOptions) {
  const e = document.createElement(shape.tagName);
  return { element: e, ...mold(e, shape, inheritedOptions) };
}

export function mold(
  htmlElement: HTMLElement,
  elementShape: HulloElement,
  parentSyncOptions: SyncOptions
): Possesion {
  const { attrs, props, events, style, children } = elementShape;
  const syncOptions: SyncOptions = {
    sync: elementShape.sync
      ? elementShape.sync
      : parentSyncOptions.sync === "branch"
      ? "branch"
      : undefined
  };
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

type ChildrenRegistry = {
  shapes: (HulloElement)[];
  elements: (HTMLElement)[];
  abandons: (Cancellation)[];
  cancels: (Cancellation)[];
};

function render_children(
  htmlElement: HTMLElement,
  syncOptions: SyncOptions,
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
  syncOptions: SyncOptions,
  nextShapes: Array<HulloElement>,
  children: ChildrenRegistry
) {
  const length = Math.max(nextShapes.length, children.shapes.length);

  for (let i = 0; i < length; i++) {
    const currentShape = children.shapes[i];
    const currentElement = children.elements[i];
    const currentCancel = children.cancels[i];
    const currentAbandon = children.abandons[i];
    const nextShape = nextShapes[i];
    let nextShapePrevPos = -1;

    // element stays on position
    if (currentShape !== undefined && currentShape === nextShape) {
      continue;
    }

    // element exists and should be moved
    else if (
      nextShape !== undefined &&
      (nextShapePrevPos = children.shapes.indexOf(nextShape, i)) >= 0
    ) {
      const nextElement = children.elements[i];
      const nextCancel = children.cancels[i];
      const nextAbandon = children.abandons[i];
      // would be otherwise removed
      if (nextShapes[nextShapePrevPos] === undefined) {
        if (currentCancel) {
          currentCancel();
        }

        htmlElement.removeChild(children.elements[nextShapePrevPos]);
        htmlElement.replaceChild(
          children.elements[nextShapePrevPos],
          children.elements[i]!
        );

        children.shapes[i] = children.shapes[nextShapePrevPos];
        children.elements[i] = children.elements[nextShapePrevPos];
        children.cancels[i] = children.cancels[nextShapePrevPos];
        children.abandons[i] = children.abandons[nextShapePrevPos];

        children.shapes.splice(nextShapePrevPos, 1);
        children.elements.splice(nextShapePrevPos, 1);
        children.cancels.splice(nextShapePrevPos, 1);
        children.abandons.splice(nextShapePrevPos, 1);
      }
      // would be otherwise replaced
      else {
        let currentElementNextNeighbour =
          nextShapePrevPos < children.elements.length
            ? children.elements[nextShapePrevPos + 1]
            : undefined;
        let nextElementNextNeighbour =
          i < children.elements.length
            ? children.elements[nextShapePrevPos + 1]
            : undefined;

        htmlElement.removeChild(currentElement);
        if (currentElementNextNeighbour) {
          htmlElement.insertBefore(currentElement, currentElementNextNeighbour);
        } else {
          htmlElement.appendChild(currentElement);
        }

        htmlElement.removeChild(nextElement);
        if (nextElementNextNeighbour) {
          htmlElement.insertBefore(nextElement, nextElementNextNeighbour);
        } else {
          htmlElement.appendChild(nextElement);
        }

        children.shapes[i] = nextShape;
        children.elements[i] = nextElement;
        children.cancels[i] = nextCancel;
        children.abandons[i] = nextAbandon;

        children.shapes[nextShapePrevPos] = currentShape;
        children.elements[nextShapePrevPos] = currentElement;
        children.cancels[nextShapePrevPos] = currentCancel;
        children.abandons[nextShapePrevPos] = currentAbandon;
      }
    }

    //element remains
    else if (
      currentShape !== undefined &&
      currentElement !== undefined &&
      nextShape
    ) {
      if (currentCancel) {
        currentCancel();
      }

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
      }
    }

    // element adding
    else if (nextShape) {
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

    // element removing
    else if (currentShape !== undefined && currentElement !== undefined) {
      htmlElement.removeChild(currentElement);
      children.shapes.splice(i, 1);
      children.elements.splice(i, 1);
      children.abandons.splice(i, 1);
      children.cancels.splice(i, 1);

      if (currentAbandon) {
        currentAbandon();
      }
    }
  }
}

function render_children_cleanup(
  _htmlElement: HTMLElement,
  _syncOptions: SyncOptions,
  children: ChildrenRegistry
) {
  children.elements.splice(0).forEach(render_children_cleanup_removeChild);
  children.cancels.splice(0).forEach(call);
}

function render_children_cleanup_removeChild(child: HTMLElement) {
  child.parentElement!.removeChild(child);
}

function render_event<NAME extends string>(
  e: HTMLElement,
  name: NAME,
  handler: In<HulloElement["events"], NAME>
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
  htmlElement: HTMLElement,
  syncOptions: SyncOptions,
  name: NAME,
  value: In<HulloElement["props"], NAME>
) {
  const defaultValue =
    name in htmlElement ? (htmlElement as any)[name] : undefined;

  return render_each(
    htmlElement,
    syncOptions,
    value,
    defaultValue,
    render_prop_each,
    render_prop_cleanup
  );
}

function render_prop_each(
  htmlElement: HTMLElement,
  _syncOptions: SyncOptions,
  value: any,
  _defaultValue: any
) {
  (htmlElement as any)[name] = value;
}

function render_prop_cleanup(
  htmlElement: HTMLElement,
  _syncOptions: SyncOptions,
  defaultValue: any
) {
  (htmlElement as any)[name] = defaultValue;
}

function render_style<NAME extends keyof CSSStyleDeclaration>(
  htmlElement: HTMLElement,
  syncOptions: SyncOptions,
  name: NAME,
  value: HulloElement["style"][NAME]
) {
  const defaultValue = htmlElement.style[name];

  return render_each(
    htmlElement,
    syncOptions,
    value,
    defaultValue,
    render_style_each,
    render_style_cleanup
  );
}

function render_style_each(
  htmlElement: HTMLElement,
  _syncOptions: SyncOptions,
  value: any,
  _defaultValue: any
) {
  htmlElement.style[name] = value;
}

function render_style_cleanup(
  htmlElement: HTMLElement,
  _syncOptions: SyncOptions,
  defaultValue: any
) {
  htmlElement.style[name] = defaultValue;
}

function render_attr<NAME extends string>(
  htmlElement: HTMLElement,
  syncOptions: SyncOptions,
  name: NAME,
  value: In<HulloElement["attrs"], NAME>
) {
  const defaultValue = htmlElement.getAttribute(name);

  return render_each(
    htmlElement,
    syncOptions,
    value,
    defaultValue,
    render_attr_each,
    render_attr_cleanup
  );
}

function render_attr_each(
  htmlElement: HTMLElement,
  _syncOptions: SyncOptions,
  value: any,
  _defaultValue: string | null
) {
  if (value == null) {
    htmlElement.removeAttribute(name);
  } else {
    htmlElement.setAttribute(name, value);
  }
}

function render_attr_cleanup(
  htmlElement: HTMLElement,
  _syncOptions: SyncOptions,
  defaultValue: string | null
) {
  if (defaultValue == null) {
    htmlElement.removeAttribute(name);
  } else {
    htmlElement.setAttribute(name, defaultValue);
  }
}

function render_each<T, S = {}>(
  htmlElement: HTMLElement,
  syncOptions: SyncOptions,
  streamOrValue: Observable<T> | T,
  state: S,
  process: (h: HTMLElement, o: SyncOptions, v: T, s: S) => void,
  cleanup: (h: HTMLElement, o: SyncOptions, s: S) => void
): Possesion {
  if (typeof streamOrValue === "function") {
    const cancel = (streamOrValue as Observable<T>)({
      next: function render_each_value(singleValue) {
        process(htmlElement, syncOptions, singleValue, state);
        if (syncOptions.sync) {
          return whenPainted();
        }
        return resolved;
      },
      complete: cleanup
        ? function render_each_cleanup() {
            cleanup(htmlElement, syncOptions, state);
            return resolved;
          }
        : resolve
    });
    return {
      abandon: cancel,
      cancel: () => {
        cleanup(htmlElement, syncOptions, state);
        cancel();
      }
    };
  } else {
    process(htmlElement, syncOptions, streamOrValue, state);
    return {
      abandon: noop,
      cancel: () => cleanup(htmlElement, syncOptions, state)
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
