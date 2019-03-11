import { Transformation } from "./compose";

export function pipe<IN, R1, R2, R3, R4, R5, R6, R7, R8, R9>(
  input: IN,
  transformation1: Transformation<IN, R1>,
  transformation2: Transformation<R1, R2>,
  transformation3: Transformation<R2, R3>,
  transformation4: Transformation<R3, R4>,
  transformation5: Transformation<R4, R5>,
  transformation6: Transformation<R5, R6>,
  transformation7: Transformation<R6, R7>,
  transformation8: Transformation<R7, R8>,
  transformation9: Transformation<R8, R9>
): R9;
export function pipe<IN, R1, R2, R3, R4, R5, R6, R7, R8>(
  input: IN,
  transformation1: Transformation<IN, R1>,
  transformation2: Transformation<R1, R2>,
  transformation3: Transformation<R2, R3>,
  transformation4: Transformation<R3, R4>,
  transformation5: Transformation<R4, R5>,
  transformation6: Transformation<R5, R6>,
  transformation7: Transformation<R6, R7>,
  transformation8: Transformation<R7, R8>
): R8;
export function pipe<IN, R1, R2, R3, R4, R5, R6, R7>(
  input: IN,
  transformation1: Transformation<IN, R1>,
  transformation2: Transformation<R1, R2>,
  transformation3: Transformation<R2, R3>,
  transformation4: Transformation<R3, R4>,
  transformation5: Transformation<R4, R5>,
  transformation6: Transformation<R5, R6>,
  transformation7: Transformation<R6, R7>
): R7;
export function pipe<IN, R1, R2, R3, R4, R5, R6>(
  input: IN,
  transformation1: Transformation<IN, R1>,
  transformation2: Transformation<R1, R2>,
  transformation3: Transformation<R2, R3>,
  transformation4: Transformation<R3, R4>,
  transformation5: Transformation<R4, R5>,
  transformation6: Transformation<R5, R6>
): R6;
export function pipe<IN, R1, R2, R3, R4, R5>(
  input: IN,
  transformation1: Transformation<IN, R1>,
  transformation2: Transformation<R1, R2>,
  transformation3: Transformation<R2, R3>,
  transformation4: Transformation<R3, R4>,
  transformation5: Transformation<R4, R5>
): R5;
export function pipe<IN, R1, R2, R3, R4>(
  input: IN,
  transformation1: Transformation<IN, R1>,
  transformation2: Transformation<R1, R2>,
  transformation3: Transformation<R2, R3>,
  transformation4: Transformation<R3, R4>
): R4;
export function pipe<IN, R1, R2, R3>(
  input: IN,
  transformation1: Transformation<IN, R1>,
  transformation2: Transformation<R1, R2>,
  transformation3: Transformation<R2, R3>
): R3;
export function pipe<IN, R1, R2>(
  input: IN,
  transformation1: Transformation<IN, R1>,
  transformation2: Transformation<R1, R2>
): R2;
export function pipe<IN, R1>(input: IN, xd1: Transformation<IN, R1>): R1;
export function pipe<IN>(input: IN): IN;
export function pipe<IN, R>(
  input: IN,
  ...transformations: Transformation<any, any>[]
): R;

export function pipe(input: any, ...transformations: any[]): any {
  let result = input;
  for (const transformation of transformations) {
    result = transformation(result);
  }
  return result;
}
