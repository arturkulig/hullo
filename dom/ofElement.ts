import { element, ElementMod } from "./element";

export function ofElement<TAG extends keyof ElementTagNameMap>(tagName: TAG) {
  return (...mods: ElementMod<ElementTagNameMap[TAG]>[]) =>
    element<TAG>(tagName, ...mods);
}
