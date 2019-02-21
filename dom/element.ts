import { Observable, Observer } from "../stream/observable";

export type ElementChildren = ElementShape[] | Observable<ElementShape[]>;

export interface ElementDesc {
  attrs: { [id: string]: string | Observable<string | undefined> };
  props: { [id: string]: any | Observable<any> };
  style: {
    [id in keyof CSSStyleDeclaration]?: string | Observable<string | undefined>
  };
  events: { [id: string]: Observer<any> | ((event: Event) => any) };
  children: ElementChildren;
}

export interface ElementShape extends ElementDesc {
  tagName: string;
}

export const element = (
  tagName: string,
  { attrs, props, style, events, children }: Partial<ElementDesc>,
  children2?: ElementChildren
): ElementShape => ({
  tagName,
  attrs: attrs || {},
  props: props || {},
  style: style || {},
  events: events || {},
  children: children2 || children || []
});
