import { Subscription } from "@hullo/core/Observable";
import { DOMElement, SyncMode } from "../element";
import { RenderApplicator } from "./RenderApplicator";
import { render } from "../render";

const textSubscription: Subscription = {
  closed: true,
  cancel() {}
};

export class ChildrenRenderApplicator
  implements RenderApplicator<Array<DOMElement | string>> {
  constructor(private htmlElement: HTMLElement, private syncMode: SyncMode) {}

  private shapes: Array<DOMElement | string> = [];
  private elements: Array<Node> = [];
  private subscriptions: Array<Subscription> = [];

  process(nextShapes: Array<DOMElement | string>) {
    const { htmlElement, syncMode, shapes, elements, subscriptions } = this;

    const nextElements: Array<Node> = [];
    const nextSubscriptions: Array<Subscription> = [];

    for (let i = 0; i < Math.max(shapes.length, nextShapes.length); i++) {
      const currentShape = shapes[i];
      const currentPossesion = subscriptions[i];
      const nextShape = nextShapes[i];
      let nextShapePrevPos = -1;

      // element stays on position
      if (
        i < shapes.length &&
        i < nextShapes.length &&
        currentShape === nextShape
      ) {
        nextElements.push(elements[i]);
        nextSubscriptions.push(subscriptions[i]);
      }

      // element exists and should be moved
      else if (
        i < nextShapes.length &&
        (nextShapePrevPos = shapes.indexOf(nextShape)) >= 0 &&
        nextShapes.indexOf(nextShape) === i
      ) {
        nextElements.push(elements[nextShapePrevPos]);
        nextSubscriptions.push(subscriptions[nextShapePrevPos]);
      }

      //element remains
      else if (i < shapes.length && i < nextShapes.length) {
        currentPossesion.cancel();

        const { element, subscription } =
          typeof nextShape === "string"
            ? {
                element: document.createTextNode(nextShape),
                subscription: textSubscription
              }
            : render(nextShape, syncMode);

        nextElements.push(element);
        nextSubscriptions.push(subscription);
      }

      // element adding
      else if (i < nextShapes.length) {
        if (typeof nextShape === "string") {
          nextElements.push(document.createTextNode(nextShape));
          nextSubscriptions.push(textSubscription);
        } else {
          const { element, subscription } = render(nextShape, syncMode);
          nextElements.push(element);
          nextSubscriptions.push(subscription);
        }
      }
    }

    // applying diff
    let currVec = 0;
    let nextVec = 0;
    while (currVec < elements.length && nextVec < nextElements.length) {
      const currLen = elements.length;
      const nextLen = nextElements.length;

      const currElem = elements[currVec];
      const nextElem = nextElements[nextVec];

      if (currElem === nextElem) {
        currVec++;
        nextVec++;
        continue;
      }

      const currElementAtNext = nextElements.indexOf(currElem, nextVec);
      if (currElementAtNext < 0) {
        htmlElement.removeChild(currElem);
        currVec++;
        continue;
      }

      const nextElementAtCurr = elements.indexOf(nextElem, currVec);
      if (nextElementAtCurr < 0) {
        if (currVec < currLen) {
          htmlElement.insertBefore(nextElem, elements[currVec]);
        } else {
          htmlElement.appendChild(nextElem);
        }
        nextVec++;
        continue;
      }

      let fromCurrVecStableLen = 0;
      for (
        let distance = 0,
          max = Math.min(nextLen - currElementAtNext, currLen - currVec);
        distance < max;
        distance++
      ) {
        if (
          elements[currVec + distance] ===
          nextElements[currElementAtNext + distance]
        ) {
          fromCurrVecStableLen++;
        } else {
          break;
        }
      }
      let leftStaysBenefit =
        fromCurrVecStableLen - (currElementAtNext - nextVec);

      let fromNextVecStableLen = 0;
      for (
        let distance = 0,
          max = Math.min(currLen - nextElementAtCurr, nextLen - nextVec);
        distance < max;
        distance++
      ) {
        if (
          elements[nextVec + distance] ===
          nextElements[nextElementAtCurr + distance]
        ) {
          fromNextVecStableLen++;
        } else {
          break;
        }
      }
      let rightStaysBenefit =
        fromNextVecStableLen - (nextElementAtCurr - currVec);

      if (leftStaysBenefit > rightStaysBenefit && rightStaysBenefit > 0) {
        for (let i = nextVec; i < currElementAtNext; i++) {
          htmlElement.insertBefore(nextElements[i], currElem);
        }
        nextVec += currElementAtNext - nextVec;

        currVec += fromCurrVecStableLen;
        nextVec += fromCurrVecStableLen;
      } else if (
        rightStaysBenefit >= leftStaysBenefit &&
        leftStaysBenefit > 0
      ) {
        for (let i = currVec; i < nextElementAtCurr; i++) {
          htmlElement.removeChild(elements[i]);
        }
        currVec += nextElementAtCurr - currVec;

        currVec += fromNextVecStableLen;
        nextVec += fromNextVecStableLen;
      } else {
        htmlElement.replaceChild(nextElem, currElem);
        currVec++;
        nextVec++;
        elements.splice(nextElementAtCurr, 1);
        shapes.splice(nextElementAtCurr, 1);
        subscriptions.splice(nextElementAtCurr, 1);
      }
    }

    for (let i = currVec; i < elements.length; i++) {
      htmlElement.removeChild(elements[i]);
    }

    for (let i = nextVec; i < nextElements.length; i++) {
      htmlElement.appendChild(nextElements[i]);
    }

    this.shapes = nextShapes;
    this.elements = nextElements;
    this.subscriptions = nextSubscriptions;
  }
}
