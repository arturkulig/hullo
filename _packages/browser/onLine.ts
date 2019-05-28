import { map } from "@hullo/core/operators/map";
import { merge } from "@hullo/core/operators/merge";
import { state } from "@hullo/core/operators/state";
import { ofEventTarget } from "./ofEventTarget";

export function onLine() {
  return ofEventTarget(window, "online")
    .pipe(map(() => true))
    .pipe(merge(ofEventTarget(window, "offline").pipe(map(() => false))))
    .pipe(state<boolean>(navigator.onLine));
}
