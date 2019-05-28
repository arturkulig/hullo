import { RenderApplicator } from "./RenderApplicator";

type ModifiableCSSRule = Exclude<
  keyof CSSStyleDeclaration,
  "length" | "parentRule"
>;

export class StyleRenderApplicator implements RenderApplicator<string | null> {
  lastValue: string | null;

  constructor(
    private htmlElement: HTMLElement,
    private styleProp: ModifiableCSSRule
  ) {
    this.lastValue = this.htmlElement.style[this.styleProp];
  }

  process(value: string) {
    if (value !== this.lastValue) {
      this.lastValue = value;
      if (value == null) {
        this.htmlElement.style[this.styleProp] = undefined;
      } else {
        this.htmlElement.style[this.styleProp] = value;
      }
    }
  }
}
