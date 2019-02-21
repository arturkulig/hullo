import { ElementShape, ElementDesc, element } from "./element";
import { Observable } from "../stream/observable";

type CustomComponent<PROPS extends object> = (p: PROPS) => ElementShape;
type TagNames = keyof ElementTagNameMap;

export function h<PROPS extends object>(
  component: CustomComponent<PROPS>,
  props: PROPS,
  ...children: PROPS extends { children: any[] }
    ? (PROPS extends { children: infer R } ? R : [])
    : []
): ElementShape;
export function h<TAG extends TagNames>(
  tag: TAG,
  props: ElementDesc,
  ...children: ElementShape[] | [Observable<ElementShape[]>]
): ElementShape;
export function h(...args: any[]): ElementShape {
  if (typeof args[0] === "function") {
    const [component, props, ...children] = args;
    return component(
      children && children.length ? { ...props, children } : props
    );
  }
  const [tag, desc, ...children] = args;
  return element(
    tag,
    desc,
    children && children.length === 1 && typeof children[0] === "function"
      ? children[0]
      : children
  );
}
