import { DOMElement, SyncMode } from "./element";
import { Subscription } from "@hullo/core/observable";
import { renderEach } from "./internals/renderEach";
import { AttrRenderApplicator } from "./internals/AttrRenderApplicator";
import { PropRenderApplicator } from "./internals/PropRenderApplicator";
import { StyleRenderApplicator } from "./internals/StyleRenderApplicator";
import { EventListenerSubscription } from "./internals/EventListenerSubscription";
import { EventObserverSubscription } from "./internals/EventObserverSubscription";
import { ChildrenRenderApplicator } from "./internals/ChildrenRenderApplicator";
import { DerefSubscription } from "./internals/DerefSubscription";
import { JoinedSubscriptions } from "./internals/JoinedSubscriptions";

export function render(
  shape: DOMElement,
  inheritedSync: SyncMode = "immediate"
): { element: HTMLElement; subscription: Subscription } {
  const htmlElement = document.createElement(shape.tagName);

  const { attrs, props, events, style, children, sync } = shape;
  const syncMode: SyncMode = sync || inheritedSync;

  const subscriptions = new Array<Subscription>();

  for (const k in attrs) {
    if (!Object.prototype.hasOwnProperty.call(attrs, k)) {
      continue;
    }
    const sub = renderEach(
      syncMode,
      attrs[k],
      new AttrRenderApplicator(htmlElement, k)
    );
    if (sub) {
      subscriptions.push(sub);
    }
  }

  for (const k in props) {
    if (!Object.prototype.hasOwnProperty.call(props, k)) {
      continue;
    }
    const sub = renderEach(
      syncMode,
      props[k],
      new PropRenderApplicator(htmlElement, k)
    );
    if (sub) {
      subscriptions.push(sub);
    }
  }

  for (const k in style) {
    if (!Object.prototype.hasOwnProperty.call(style, k)) {
      continue;
    }
    const sub = renderEach(
      syncMode,
      style[k],
      new StyleRenderApplicator(htmlElement, k as any)
    );
    if (sub) {
      subscriptions.push(sub);
    }
  }

  for (const k in events) {
    if (!Object.prototype.hasOwnProperty.call(events, k)) {
      continue;
    }
    const handler = events[k];
    subscriptions.push(
      typeof handler === "function"
        ? new EventListenerSubscription(htmlElement, k, handler)
        : new EventObserverSubscription(htmlElement, k, handler)
    );
  }

  const childrenSub = renderEach(
    syncMode,
    children,
    new ChildrenRenderApplicator(htmlElement, syncMode)
  );
  if (childrenSub) {
    subscriptions.push(childrenSub);
  }

  if (shape.ref) {
    shape.ref(htmlElement);
  }

  if (shape.deref) {
    subscriptions.push(new DerefSubscription(shape, htmlElement));
  }

  return {
    element: htmlElement,
    subscription: new JoinedSubscriptions(subscriptions)
  };
}
