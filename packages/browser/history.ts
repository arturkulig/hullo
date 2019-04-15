import { duplex } from "@hullo/core/duplex";
import { channel } from "@hullo/core/channel";
import { merge } from "@hullo/core/operators/merge";
import { map } from "@hullo/core/operators/map";
import { state } from "@hullo/core/operators/state";
import { ofEventTarget } from "./ofEventTarget";

export function history<STATE = any>() {
  if (typeof URL === "undefined") {
    throw new Error("URL class polyfill required");
  }
  const pushState$ = channel<void>();
  const popState$ = ofEventTarget(window, "popstate");
  const history$ = popState$
    .pipe(merge(pushState$))
    .pipe(
      map(
        (_event): { state: STATE | null; url: URL } => ({
          state: window.history.state == null ? null : window.history.state,
          url: new URL(window.location.href)
        })
      )
    )
    .pipe(
      state<{ state: STATE | null; url: URL }>({
        state: window.history.state == null ? null : window.history.state,
        url: new URL(window.location.href)
      })
    );
  return duplex<
    { state: STATE; title?: string; url?: string } | string,
    { state: STATE | null; url: URL }
  >(history$, {
    get closed() {
      return pushState$.closed;
    },

    next: v => {
      if (typeof v === "string") {
        window.history.pushState(window.history.state, "", v);
      } else {
        window.history.pushState(v.state, v.title || "", v.url || null);
      }
      return pushState$.next();
    },

    complete: () => {
      return Promise.all([pushState$.complete(), popState$.complete()]);
    }
  });
}
