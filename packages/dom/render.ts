import { DOMElement, SyncMode } from "./element";
import {
  Observer,
  Observable,
  Subscriber,
  Subscription
} from "@hullo/core/observable";

interface Possesion {
  clean(element: HTMLElement, abandonment: boolean): void;
}

export function render(shape: DOMElement) {
  const e = document.createElement(shape.tagName);
  return { element: e, possesion: mold(e, shape) };
}

function render_internal(shape: DOMElement, inheritedSync: SyncMode) {
  const e = document.createElement(shape.tagName);
  return { element: e, possesion: mold(e, shape, inheritedSync) };
}

export function mold(
  htmlElement: HTMLElement,
  elementShape: DOMElement,
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
    possesions.push(new DerefPossesion(elementShape));
  }

  return new JoinedPossesions(possesions);
}

class JoinedPossesions implements Possesion {
  constructor(private possesions: Possesion[]) {}

  clean(htmlElement: HTMLElement, abandonment: boolean) {
    for (let i = 0; i < this.possesions.length; i++) {
      this.possesions[i].clean(htmlElement, abandonment);
    }
  }
}

class DerefPossesion implements Possesion {
  constructor(private shape: DOMElement) {}
  clean(htmlElement: HTMLElement, _abandonment: boolean) {
    this.shape.deref!(htmlElement);
  }
}

type In<T, N extends keyof T> = T[N];

type ChildrenRegistry = {
  shapes: DOMElement[];
  elements: HTMLElement[];
  possesions: Possesion[];
};

function render_children(
  htmlElement: HTMLElement,
  syncOptions: SyncMode,
  childShapes$: DOMElement["children"]
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
  nextShapes: Array<DOMElement>,
  children: ChildrenRegistry
) {
  const { shapes, elements, possesions } = children;

  const nextElements: typeof elements = [];
  const nextPossesions: typeof possesions = [];

  for (let i = 0; i < Math.max(shapes.length, nextShapes.length); i++) {
    const currentShape = shapes[i];
    const currentElement = elements[i];
    const currentPossesion = possesions[i];
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
    }

    // element exists and should be moved
    else if (
      i < nextShapes.length &&
      (nextShapePrevPos = shapes.indexOf(nextShape)) >= 0 &&
      nextShapes.indexOf(nextShape) === i
    ) {
      nextElements.push(elements[nextShapePrevPos]);
      nextPossesions.push(possesions[nextShapePrevPos]);
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
      const { element, possesion } = render_internal(nextShape, syncOptions);
      nextElements.push(element);
      nextPossesions.push(possesion);
    }
  }

  // diff
  let currVec = 0;
  let nextVec = 0;
  while (currVec < elements.length && nextVec < nextElements.length) {
    const currLen = elements.length;
    const nextLen = nextElements.length;

    const currElem = elements[currVec];
    const nextElem = nextElements[nextVec];

    if (currElem === nextElem) {
      currVec++;
      nextVec++;
      continue;
    }

    const currElementAtNext = nextElements.indexOf(currElem, nextVec);
    if (currElementAtNext < 0) {
      htmlElement.removeChild(currElem);
      currVec++;
      continue;
    }

    const nextElementAtCurr = elements.indexOf(nextElem, currVec);
    if (nextElementAtCurr < 0) {
      if (currVec < currLen) {
        htmlElement.insertBefore(nextElem, elements[currVec]);
      } else {
        htmlElement.appendChild(nextElem);
      }
      nextVec++;
      continue;
    }

    let fromCurrVecStableLen = 0;
    for (
      let distance = 0,
        max = Math.min(nextLen - currElementAtNext, currLen - currVec);
      distance < max;
      distance++
    ) {
      if (
        elements[currVec + distance] ===
        nextElements[currElementAtNext + distance]
      ) {
        fromCurrVecStableLen++;
      } else {
        break;
      }
    }
    let leftStaysBenefit = fromCurrVecStableLen - (currElementAtNext - nextVec);

    let fromNextVecStableLen = 0;
    for (
      let distance = 0,
        max = Math.min(currLen - nextElementAtCurr, nextLen - nextVec);
      distance < max;
      distance++
    ) {
      if (
        elements[nextVec + distance] ===
        nextElements[nextElementAtCurr + distance]
      ) {
        fromNextVecStableLen++;
      } else {
        break;
      }
    }
    let rightStaysBenefit =
      fromNextVecStableLen - (nextElementAtCurr - currVec);

    if (leftStaysBenefit > rightStaysBenefit && rightStaysBenefit > 0) {
      for (let i = nextVec; i < currElementAtNext; i++) {
        htmlElement.insertBefore(nextElements[i], currElem);
      }
      nextVec += currElementAtNext - nextVec;

      currVec += fromCurrVecStableLen;
      nextVec += fromCurrVecStableLen;
    } else if (rightStaysBenefit >= leftStaysBenefit && leftStaysBenefit > 0) {
      for (let i = currVec; i < nextElementAtCurr; i++) {
        htmlElement.removeChild(elements[i]);
      }
      currVec += nextElementAtCurr - currVec;

      currVec += fromNextVecStableLen;
      nextVec += fromNextVecStableLen;
    } else {
      htmlElement.replaceChild(nextElem, currElem);
      currVec++;
      nextVec++;
      elements.splice(nextElementAtCurr, 1);
      shapes.splice(nextElementAtCurr, 1);
      possesions.splice(nextElementAtCurr, 1);
    }
  }

  for (let i = currVec; i < elements.length; i++) {
    htmlElement.removeChild(elements[i]);
  }

  for (let i = nextVec; i < nextElements.length; i++) {
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
  handler: In<DOMElement["events"], NAME>
): Possesion {
  htmlElement.addEventListener(name, handler as (event: Event) => any);

  return {
    clean: function cancelEventListenerApplication() {
      htmlElement.removeEventListener(name, handler as (event: Event) => any);
    }
  };
}

function render_event_observer<NAME extends string>(
  htmlElement: HTMLElement,
  name: NAME,
  handler: In<DOMElement["events"], NAME>
): Possesion {
  const observer = handler as Observer<Event>;
  let closed = false;

  htmlElement.addEventListener(name, render_event_observer_listener);

  return {
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
  value: In<DOMElement["props"], NAME>
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
  value: DOMElement["style"][NAME]
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
  value: In<DOMElement["attrs"], NAME>
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
  if (Observable.isObservable(streamOrValue)) {
    const isClosed = { ref: false };
    return new RenderEachStreamPossesions<S>(
      isClosed,
      cleanup,
      streamOrValue.subscribe(
        new RenderEachObserver(isClosed, htmlElement, syncMode, state, process)
      ),
      syncMode,
      state
    );
  } else {
    process(htmlElement, syncMode, streamOrValue as T, state);
    return new RenderEachPossesions<S>(cleanup, syncMode, state);
  }
}

class RenderEachObserver<T, S = {}> implements Observer<T> {
  get closed() {
    return this.isClosed.ref;
  }

  constructor(
    private isClosed: { ref: boolean },
    private htmlElement: HTMLElement,
    private syncMode: SyncMode,
    private state: S,
    private process: (h: HTMLElement, o: SyncMode, v: T, s: S) => void
  ) {}

  next(singleValue: T) {
    this.process(this.htmlElement, this.syncMode, singleValue, this.state);
    if (this.syncMode !== "immediate") {
      return whenPainted();
    }
    return Promise.resolve();
  }

  complete() {
    return Promise.resolve();
  }
}

class RenderEachStreamPossesions<S> implements Possesion {
  constructor(
    private isClosed: { ref: boolean },
    private cleanup: (h: HTMLElement, o: SyncMode, s: S) => void,
    private subscription: Subscription,
    private syncMode: SyncMode,
    private state: S
  ) {}

  clean(htmlElement: HTMLElement, abandonment: boolean) {
    this.isClosed.ref = true;
    if (!abandonment) {
      this.cleanup(htmlElement, this.syncMode, this.state);
    }
    if (this.subscription && !this.subscription.closed) {
      this.subscription.cancel();
    }
  }
}

class RenderEachPossesions<S> implements Possesion {
  constructor(
    private cleanup: (h: HTMLElement, o: SyncMode, s: S) => void,
    private syncMode: SyncMode,
    private state: S
  ) {}

  clean(htmlElement: HTMLElement, abandonment: boolean) {
    if (!abandonment) {
      this.cleanup(htmlElement, this.syncMode, this.state);
    }
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
