import { Subscription, AsyncObserver } from "../core";
import { ref } from "./decorate";

export type EventNames = Extract<keyof HTMLElementEventMap, string>;

export function events<SomeHTMLElement extends HTMLElement = HTMLElement>(
  eventDeclaration: {
    [EventName in EventNames]?:
      | ((this: SomeHTMLElement, event: HTMLElementEventMap[EventName]) => any)
      | AsyncObserver<HTMLElementEventMap[EventName]>
  }
) {
  const eventSub: Subscription[] = [];

  return function applyHandlers(
    element$: AsyncIterable<SomeHTMLElement>
  ): AsyncIterable<SomeHTMLElement> {
    return ref<SomeHTMLElement>(element => {
      const assignedListeners: {
        eventName: EventNames;
        listener: (event: Event) => any;
      }[] = [];
      const ready: Array<Promise<void>> = [];

      for (const eventName of Object.keys(eventDeclaration) as Array<
        keyof HTMLElementEventMap
      >) {
        if (
          !Object.prototype.hasOwnProperty.call(eventDeclaration, eventName)
        ) {
          continue;
        }

        const handler = eventDeclaration[eventName];

        if (typeof handler === "object") {
          const listener = (event: Event) => {
            handler.next.call(element, event);
          };
          assignedListeners.push({
            eventName,
            listener
          });
          element.addEventListener(eventName, listener);
        } else if (typeof handler === "function") {
          assignedListeners.push({
            eventName,
            listener: handler as any
          });
          element.addEventListener(eventName, handler as any);
        }
      }

      return Promise.all(ready).then(() => () => {
        for (const sub of eventSub) {
          if (!sub.closed) {
            sub.unsubscribe();
          }
        }
        for (const { eventName, listener } of assignedListeners) {
          element.removeEventListener(eventName, listener);
        }
        assignedListeners.splice(0);
      });
    })(element$);
  };
}
