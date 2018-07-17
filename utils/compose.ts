export type Transformer<IN, R> = (input: IN) => R;

export function compose<IN, R1, R2, R3, R4, R5, R6, R7, R8, R9>(
  trans1: Transformer<IN, R1>,
  trans2: Transformer<R1, R2>,
  trans3: Transformer<R2, R3>,
  trans4: Transformer<R3, R4>,
  trans5: Transformer<R4, R5>,
  trans6: Transformer<R5, R6>,
  trans7: Transformer<R6, R7>,
  trans8: Transformer<R7, R8>,
  trans9: Transformer<R8, R9>
): Transformer<IN, R9>;
export function compose<IN, R1, R2, R3, R4, R5, R6, R7, R8>(
  trans1: Transformer<IN, R1>,
  trans2: Transformer<R1, R2>,
  trans3: Transformer<R2, R3>,
  trans4: Transformer<R3, R4>,
  trans5: Transformer<R4, R5>,
  trans6: Transformer<R5, R6>,
  trans7: Transformer<R6, R7>,
  trans8: Transformer<R7, R8>
): Transformer<IN, R8>;
export function compose<IN, R1, R2, R3, R4, R5, R6, R7>(
  trans1: Transformer<IN, R1>,
  trans2: Transformer<R1, R2>,
  trans3: Transformer<R2, R3>,
  trans4: Transformer<R3, R4>,
  trans5: Transformer<R4, R5>,
  trans6: Transformer<R5, R6>,
  trans7: Transformer<R6, R7>
): Transformer<IN, R7>;
export function compose<IN, R1, R2, R3, R4, R5, R6>(
  trans1: Transformer<IN, R1>,
  trans2: Transformer<R1, R2>,
  trans3: Transformer<R2, R3>,
  trans4: Transformer<R3, R4>,
  trans5: Transformer<R4, R5>,
  trans6: Transformer<R5, R6>
): Transformer<IN, R6>;
export function compose<IN, R1, R2, R3, R4, R5>(
  trans1: Transformer<IN, R1>,
  trans2: Transformer<R1, R2>,
  trans3: Transformer<R2, R3>,
  trans4: Transformer<R3, R4>,
  trans5: Transformer<R4, R5>
): Transformer<IN, R5>;
export function compose<IN, R1, R2, R3, R4>(
  trans1: Transformer<IN, R1>,
  trans2: Transformer<R1, R2>,
  trans3: Transformer<R2, R3>,
  trans4: Transformer<R3, R4>
): Transformer<IN, R4>;
export function compose<IN, R1, R2, R3>(
  trans1: Transformer<IN, R1>,
  trans2: Transformer<R1, R2>,
  trans3: Transformer<R2, R3>
): Transformer<IN, R3>;
export function compose<IN, R1, R2>(
  trans1: Transformer<IN, R1>,
  trans2: Transformer<R1, R2>
): Transformer<IN, R2>;
export function compose<IN, R1>(xd1: Transformer<IN, R1>): Transformer<IN, R1>;
export function compose<IN>(): Transformer<IN, IN>;
export function compose<IN, R>(
  ...transformers: Transformer<any, any>[]
): Transformer<IN, R>;

export function compose(
  ...transformers: Array<(input: any) => any>
): (input: any) => any {
  return input => {
    let result = input;
    for (const transformer of transformers) {
      result = (transformer as Function)(result);
    }
    return result;
  };
}
