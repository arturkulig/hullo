import { subscribe, isAsyncIterable, Subscription } from "../core";
import { ref } from "./decorate";

export function props<PROPPED_ELEMENT>(
  propsDeclaration: {
    [PropName in keyof PROPPED_ELEMENT]?:
      | PROPPED_ELEMENT[PropName]
      | AsyncIterable<PROPPED_ELEMENT[PropName]>
  }
) {
  const propsSub: Subscription[] = [];

  return function applyProps<
    ACTUAL_ELEMENT extends HTMLElement & PROPPED_ELEMENT
  >(element$: AsyncIterable<ACTUAL_ELEMENT>): AsyncIterable<ACTUAL_ELEMENT> {
    return ref<ACTUAL_ELEMENT>(element => {
      const defaultProps: {
        [id in keyof PROPPED_ELEMENT]?: PROPPED_ELEMENT[id]
      } = {};
      const ready: Array<Promise<void>> = [];

      for (const propName in propsDeclaration) {
        if (!Object.prototype.hasOwnProperty.call(propsDeclaration, propName)) {
          continue;
        }
        const prop:
          | ACTUAL_ELEMENT[typeof propName]
          | AsyncIterable<ACTUAL_ELEMENT[typeof propName]> = propsDeclaration[
          propName
        ] as any;
        if (
          isAsyncIterable<
            PROPPED_ELEMENT[Extract<keyof PROPPED_ELEMENT, string>]
          >(prop)
        ) {
          ready.push(
            new Promise((resolve, reject) => {
              propsSub.push(
                subscribe(prop, {
                  next(propValue) {
                    if (!(propName in defaultProps)) {
                      defaultProps[propName] = propValue;
                    }
                    element[propName] = propValue;
                    resolve();
                  },
                  error: reject,
                  complete: reject
                })
              );
            })
          );
        } else {
          if (!(propName in defaultProps)) {
            defaultProps[propName] = prop;
          }
          element[propName] = prop;
        }
      }

      return Promise.all(ready).then(() => () => {
        for (const sub of propsSub) {
          if (!sub.closed) {
            sub.unsubscribe();
          }
        }
        for (const id in defaultProps) {
          if (!Object.prototype.hasOwnProperty.call(defaultProps, id)) {
            continue;
          }
          element[id] = defaultProps[id] as any;
        }
      });
    })(element$);
  };
}
