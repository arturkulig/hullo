import { HulloElement, SyncMode } from "./element";
import {
  IObserver,
  IObservable,
  PartialObserver,
  Subscription
} from "../core/observable";

interface RenderCancellation<CTX = Possesion> {
  (this: CTX, element: HTMLElement, abandonment: boolean): void;
}

interface Possesion<CTX = any> {
  // abandon: RenderCancellation;
  clean: RenderCancellation<CTX>;
}

export function render(shape: HulloElement) {
  const e = document.createElement(shape.tagName);
  return { element: e, possesion: mold(e, shape) };
}

function render_internal(shape: HulloElement, inheritedSync: SyncMode) {
  const e = document.createElement(shape.tagName);
  return { element: e, possesion: mold(e, shape, inheritedSync) };
}

export function mold(
  htmlElement: HTMLElement,
  elementShape: HulloElement,
  inheritedSync?: SyncMode
): JoinedPossesions {
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
    const dp: DerefPossesion = {
      shape: elementShape,
      clean: derefCancel
    };
    possesions.push(dp);
  }

  return {
    possesions,
    clean: joinedPossesionsCancel
  };
}

interface JoinedPossesions extends Possesion<JoinedPossesions> {
  possesions: Possesion[];
  clean(
    this: JoinedPossesions,
    htmlElement: HTMLElement,
    abandonment: boolean
  ): void;
}

function joinedPossesionsCancel(
  this: JoinedPossesions,
  htmlElement: HTMLElement,
  abandonment: boolean
) {
  for (let i = 0; i < this.possesions.length; i++) {
    this.possesions[i].clean(htmlElement, abandonment);
  }
}

interface DerefPossesion extends Possesion<DerefPossesion> {
  shape: HulloElement;
  clean(
    this: DerefPossesion,
    htmlElement: HTMLElement,
    abandonment: boolean
  ): void;
}

function derefCancel(
  this: DerefPossesion,
  htmlElement: HTMLElement,
  _abandonment: boolean
) {
  this.shape.deref!(htmlElement);
}

type In<T, N extends keyof T> = T[N];

type ChildrenRegistry = {
  shapes: HulloElement[];
  elements: HTMLElement[];
  possesions: Possesion[];
};

function render_children(
  htmlElement: HTMLElement,
  syncOptions: SyncMode,
  childShapes$: HulloElement["children"]
) {
  const children: ChildrenRegistry = {
    shapes: [],
    elements: [],
    possesions: []
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
  const {
    shapes,
    elements,
    possesions
    //  abandons
  } = children;

  const nextElements: typeof elements = [];
  const nextPossesions: typeof possesions = [];
  // const nextAbandons: typeof abandons = [];

  for (let i = 0; i < Math.max(shapes.length, nextShapes.length); i++) {
    const currentShape = shapes[i];
    const currentElement = elements[i];
    const currentPossesion = possesions[i];
    // const currentAbandon = abandons[i];
    const nextShape = nextShapes[i];
    let nextShapePrevPos = -1;

    // element stays on position
    if (
      i < shapes.length &&
      i < nextShapes.length &&
      currentShape === nextShape
    ) {
      nextElements.push(elements[i]);
      nextPossesions.push(possesions[i]);
      // nextAbandons.push(abandons[i]);
    }

    // element exists and should be moved
    else if (
      i < nextShapes.length &&
      (nextShapePrevPos = shapes.indexOf(nextShape)) >= 0 &&
      nextShapes.indexOf(nextShape) === i
    ) {
      nextElements.push(elements[nextShapePrevPos]);
      nextPossesions.push(possesions[nextShapePrevPos]);
      // nextAbandons.push(abandons[nextShapePrevPos]);
    }

    //element remains
    else if (i < shapes.length && i < nextShapes.length) {
      const abandon = currentShape.tagName !== nextShape.tagName;
      currentPossesion.clean(currentElement, abandon);
      const { element, possesion } = abandon
        ? render_internal(nextShape, syncOptions)
        : {
            element: currentElement,
            possesion: mold(currentElement, nextShape, syncOptions)
          };

      nextElements.push(element);
      nextPossesions.push(possesion);
    }

    // element adding
    else if (i < nextShapes.length) {
      const {
        element,
        // abandon,
        possesion
      } = render_internal(nextShape, syncOptions);
      nextElements.push(element);
      // nextAbandons.push(abandon);
      nextPossesions.push(possesion);
    }

    //
    else if (i < shapes.length) {
      // currentAbandon(currentElement);
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
      possesions.splice(nextInCurrent, 1);
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
  children.possesions = nextPossesions;
}

function render_children_cleanup(
  htmlElement: HTMLElement,
  _syncOptions: SyncMode,
  _children: ChildrenRegistry
) {
  for (let i = 0, l = htmlElement.children.length; i < l; i++) {
    htmlElement.removeChild(htmlElement.firstChild!);
  }
}

function render_event_regular<NAME extends string>(
  htmlElement: HTMLElement,
  name: NAME,
  handler: In<HulloElement["events"], NAME>
): Possesion {
  htmlElement.addEventListener(name, handler as (event: Event) => any);

  return {
    // abandon: noop,
    clean: function cancelEventListenerApplication() {
      htmlElement.removeEventListener(name, handler as (event: Event) => any);
    }
  };
}

function render_event_observer<NAME extends string>(
  htmlElement: HTMLElement,
  name: NAME,
  handler: In<HulloElement["events"], NAME>
): Possesion {
  const observer = handler as IObserver<Event>;
  let closed = false;

  htmlElement.addEventListener(name, render_event_observer_listener);

  return {
    // abandon: render_event_observer_cancel,
    clean: render_event_observer_cancel
  };

  function render_event_observer_cancel() {
    if (closed) {
      return;
    }
    closed = true;
    htmlElement.removeEventListener(name, render_event_observer_listener);
    observer.complete();
  }

  function render_event_observer_listener<T extends Event>(event: T) {
    if (closed) {
      return;
    }
    observer.next(event);
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
  streamOrValue: IObservable<T> | T,
  state: S,
  process: (h: HTMLElement, o: SyncMode, v: T, s: S) => void,
  cleanup: (h: HTMLElement, o: SyncMode, s: S) => void
): Possesion {
  if (
    typeof streamOrValue === "object" &&
    streamOrValue &&
    (streamOrValue as any).subscribe
  ) {
    const observer: RenderEachObserver<T, S> = {
      htmlElement,
      syncMode,
      state,
      process,
      cleanup,
      next: render_each_next
    };
    const subscription = (streamOrValue as IObservable<T>).subscribe(observer);
    const repc: RenderEachPossesions<S> = {
      cleanup,
      subscription,
      syncMode,
      state,
      clean: render_each_possesionsClean
    };
    return repc;
  } else {
    process(htmlElement, syncMode, streamOrValue as T, state);
    const repc: RenderEachPossesions<S> = {
      cleanup,
      syncMode,
      state,
      clean: render_each_possesionsClean
    };
    return repc;
  }
}

interface RenderEachObserver<T, S = {}> extends PartialObserver<T> {
  htmlElement: HTMLElement;
  syncMode: SyncMode;
  state: S;
  process: (h: HTMLElement, o: SyncMode, v: T, s: S) => void;
  cleanup: (h: HTMLElement, o: SyncMode, s: S) => void;
}

function render_each_next<T, S>(
  this: RenderEachObserver<T, S>,
  singleValue: T
) {
  this.process(this.htmlElement, this.syncMode, singleValue, this.state);
  if (this.syncMode !== "immediate") {
    return whenPainted();
  }
}

interface RenderEachPossesions<S> extends Possesion<RenderEachPossesions<S>> {
  cleanup: (h: HTMLElement, o: SyncMode, s: S) => void;
  subscription?: Subscription;
  syncMode: SyncMode;
  state: S;
}

function render_each_possesionsClean<S>(
  this: RenderEachPossesions<S>,
  htmlElement: HTMLElement,
  abandonment: boolean
) {
  if (!abandonment) {
    this.cleanup(htmlElement, this.syncMode, this.state);
  }
  if (this.subscription && !this.subscription.closed) {
    this.subscription.cancel();
  }
}

// paint sync

let resolveWhenPainted: null | ((v: void) => any) = null;
let whenPaintedTask: null | Promise<void> = null;

const whenPainted: () => Promise<void> =
  typeof window === "undefined" || !("requestAnimationFrame" in window)
    ? function getWhenPainted() {
        return (
          whenPaintedTask ||
          (whenPaintedTask = new Promise<void>(whenPainter_timeout))
        );
      }
    : function getWhenPainted() {
        return (
          whenPaintedTask ||
          (whenPaintedTask = new Promise<void>(whenPainted_raf))
        );
      };

function whenPainter_timeout(resolve: (v: void) => any) {
  setTimeout(flushWhenPaintedCbs, 0);
  resolveWhenPainted = resolve;
}

function whenPainted_raf(resolve: (v: void) => any) {
  window.requestAnimationFrame(flushWhenPaintedCbs);
  resolveWhenPainted = resolve;
}

function flushWhenPaintedCbs() {
  whenPaintedTask = null;
  if (resolveWhenPainted) {
    const _whenPaintedConsumer = resolveWhenPainted;
    resolveWhenPainted = null;
    _whenPaintedConsumer();
  }
}
