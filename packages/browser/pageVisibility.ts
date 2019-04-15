import { ofEventTarget } from "./ofEventTarget";
import { map } from "@hullo/core/operators/map";
import { state } from "@hullo/core/operators/state";

export function pageVisibility() {
  return ofEventTarget(window.document, "visibilitychange")
    .pipe(map(() => document.visibilityState))
    .pipe(state(document.visibilityState));
}
