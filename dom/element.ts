import { observable, pipe, subscribe, channel, Subscription } from "../core";
import { state } from "../op/state";

export interface ElementMod<KIND = HTMLElement> {
  (element$: AsyncIterable<KIND>): AsyncIterable<KIND>;
}

export function element<TAG extends keyof ElementTagNameMap>(
  tagName: TAG,
  ...mods: ElementMod<ElementTagNameMap[TAG]>[]
) {
  let materializedModdedBroadcast: AsyncIterable<
    ElementTagNameMap[TAG]
  > | null = null;

  let sourcingSub: Subscription | null = null;

  let subscribersCount = 0;
  let cancelCleanup: (() => any) | null = null;

  return observable<ElementTagNameMap[TAG]>(observer => {
    if (!materializedModdedBroadcast) {
      const element$ = channel<ElementTagNameMap[TAG]>();
      const moddedElement$: AsyncIterable<ElementTagNameMap[TAG]> = pipe(
        element$,
        ...mods
      );
      const moddedBroadcast = channel<ElementTagNameMap[TAG]>();
      materializedModdedBroadcast = state(moddedBroadcast);
      sourcingSub = subscribe(moddedElement$, moddedBroadcast);

      const htmlElement = document.createElement(tagName);
      element$.next(htmlElement);
    }

    const distributionSub = subscribe(materializedModdedBroadcast, observer);

    if (cancelCleanup != null) {
      cancelCleanup();
      cancelCleanup = null;
    }

    subscribersCount++;

    return () => {
      if (!distributionSub.closed) {
        distributionSub.unsubscribe();
      }

      subscribersCount--;
      if (subscribersCount === 0) {
        cancelCleanup = defer(() => {
          if (subscribersCount === 0) {
            if (sourcingSub) {
              sourcingSub.unsubscribe();
            }
            sourcingSub = null;
            materializedModdedBroadcast = null;
          }
        });
      }
    };
  });
}

function defer(action: () => any) {
  if (
    window &&
    "requestIdleCallback" in window &&
    "cancelIdleCallback" in window
  ) {
    const realm = (window as any) as {
      requestIdleCallback: Function;
      cancelIdleCallback: Function;
    };
    const rICHandle = realm.requestIdleCallback(action);
    return () => {
      realm.cancelIdleCallback(rICHandle);
    };
  }
  const cleanupTimer = setTimeout(action, 0);
  return () => {
    clearTimeout(cleanupTimer);
  };
}
