import { RenderApplicator } from "./RenderApplicator";

export class PropRenderApplicator implements RenderApplicator<any> {
  lastValue: any;

  constructor(private htmlElement: HTMLElement, private prop: string) {
    this.lastValue = (this.htmlElement as any)[this.prop];
  }

  process(value: any) {
    if (value !== this.lastValue) {
      this.lastValue = value;
      (this.htmlElement as any)[this.prop] = value;
    }
  }
}
