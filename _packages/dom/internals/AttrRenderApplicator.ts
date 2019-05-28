import { RenderApplicator } from "./RenderApplicator";

export class AttrRenderApplicator implements RenderApplicator<string | null> {
  lastValue: string | null;

  constructor(private htmlElement: HTMLElement, private attribute: string) {
    this.lastValue = this.htmlElement.getAttribute(this.attribute);
  }

  process(value: string) {
    if (value !== this.lastValue) {
      this.lastValue = value;
      if (value == null) {
        this.htmlElement.removeAttribute(this.attribute);
      } else {
        this.htmlElement.setAttribute(this.attribute, value);
      }
    }
  }
}
