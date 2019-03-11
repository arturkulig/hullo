export type Transformation<IN, R> = (input: IN, ...args: any[]) => R;

export function compose<IN, R1, R2, R3, R4, R5, R6, R7, R8, R9>(
  transformation1: Transformation<IN, R1>,
  transformation2: Transformation<R1, R2>,
  transformation3: Transformation<R2, R3>,
  transformation4: Transformation<R3, R4>,
  transformation5: Transformation<R4, R5>,
  transformation6: Transformation<R5, R6>,
  transformation7: Transformation<R6, R7>,
  transformation8: Transformation<R7, R8>,
  transformation9: Transformation<R8, R9>
): Transformation<IN, R9>;
export function compose<IN, R1, R2, R3, R4, R5, R6, R7, R8>(
  transformation1: Transformation<IN, R1>,
  transformation2: Transformation<R1, R2>,
  transformation3: Transformation<R2, R3>,
  transformation4: Transformation<R3, R4>,
  transformation5: Transformation<R4, R5>,
  transformation6: Transformation<R5, R6>,
  transformation7: Transformation<R6, R7>,
  transformation8: Transformation<R7, R8>
): Transformation<IN, R8>;
export function compose<IN, R1, R2, R3, R4, R5, R6, R7>(
  transformation1: Transformation<IN, R1>,
  transformation2: Transformation<R1, R2>,
  transformation3: Transformation<R2, R3>,
  transformation4: Transformation<R3, R4>,
  transformation5: Transformation<R4, R5>,
  transformation6: Transformation<R5, R6>,
  transformation7: Transformation<R6, R7>
): Transformation<IN, R7>;
export function compose<IN, R1, R2, R3, R4, R5, R6>(
  transformation1: Transformation<IN, R1>,
  transformation2: Transformation<R1, R2>,
  transformation3: Transformation<R2, R3>,
  transformation4: Transformation<R3, R4>,
  transformation5: Transformation<R4, R5>,
  transformation6: Transformation<R5, R6>
): Transformation<IN, R6>;
export function compose<IN, R1, R2, R3, R4, R5>(
  transformation1: Transformation<IN, R1>,
  transformation2: Transformation<R1, R2>,
  transformation3: Transformation<R2, R3>,
  transformation4: Transformation<R3, R4>,
  transformation5: Transformation<R4, R5>
): Transformation<IN, R5>;
export function compose<IN, R1, R2, R3, R4>(
  transformation1: Transformation<IN, R1>,
  transformation2: Transformation<R1, R2>,
  transformation3: Transformation<R2, R3>,
  transformation4: Transformation<R3, R4>
): Transformation<IN, R4>;
export function compose<IN, R1, R2, R3>(
  transformation1: Transformation<IN, R1>,
  transformation2: Transformation<R1, R2>,
  transformation3: Transformation<R2, R3>
): Transformation<IN, R3>;
export function compose<IN, R1, R2>(
  transformation1: Transformation<IN, R1>,
  transformation2: Transformation<R1, R2>
): Transformation<IN, R2>;
export function compose<IN, R1>(
  xd1: Transformation<IN, R1>
): Transformation<IN, R1>;
export function compose<IN>(): Transformation<IN, IN>;
export function compose<IN, R>(
  ...transformations: Transformation<any, any>[]
): Transformation<IN, R>;

export function compose(
  ...transformations: Array<(input: any) => any>
): (input: any) => any {
  return function compose_I(input) {
    let result = input;
    for (const transformation of transformations) {
      result = transformation(result);
    }
    return result;
  };
}
