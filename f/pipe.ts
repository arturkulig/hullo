import { compose, Transformer } from "./compose";

export function pipe<IN, R1, R2, R3, R4, R5, R6, R7, R8, R9>(
  input: IN,
  xd1: Transformer<IN, R1>,
  xd2: Transformer<R1, R2>,
  xd3: Transformer<R2, R3>,
  xd4: Transformer<R3, R4>,
  xd5: Transformer<R4, R5>,
  xd6: Transformer<R5, R6>,
  xd7: Transformer<R6, R7>,
  xd8: Transformer<R7, R8>,
  xd9: Transformer<R8, R9>
): R9;
export function pipe<IN, R1, R2, R3, R4, R5, R6, R7, R8>(
  input: IN,
  xd1: Transformer<IN, R1>,
  xd2: Transformer<R1, R2>,
  xd3: Transformer<R2, R3>,
  xd4: Transformer<R3, R4>,
  xd5: Transformer<R4, R5>,
  xd6: Transformer<R5, R6>,
  xd7: Transformer<R6, R7>,
  xd8: Transformer<R7, R8>
): R8;
export function pipe<IN, R1, R2, R3, R4, R5, R6, R7>(
  input: IN,
  xd1: Transformer<IN, R1>,
  xd2: Transformer<R1, R2>,
  xd3: Transformer<R2, R3>,
  xd4: Transformer<R3, R4>,
  xd5: Transformer<R4, R5>,
  xd6: Transformer<R5, R6>,
  xd7: Transformer<R6, R7>
): R7;
export function pipe<IN, R1, R2, R3, R4, R5, R6>(
  input: IN,
  xd1: Transformer<IN, R1>,
  xd2: Transformer<R1, R2>,
  xd3: Transformer<R2, R3>,
  xd4: Transformer<R3, R4>,
  xd5: Transformer<R4, R5>,
  xd6: Transformer<R5, R6>
): R6;
export function pipe<IN, R1, R2, R3, R4, R5>(
  input: IN,
  xd1: Transformer<IN, R1>,
  xd2: Transformer<R1, R2>,
  xd3: Transformer<R2, R3>,
  xd4: Transformer<R3, R4>,
  xd5: Transformer<R4, R5>
): R5;
export function pipe<IN, R1, R2, R3, R4>(
  input: IN,
  xd1: Transformer<IN, R1>,
  xd2: Transformer<R1, R2>,
  xd3: Transformer<R2, R3>,
  xd4: Transformer<R3, R4>
): R4;
export function pipe<IN, R1, R2, R3>(
  input: IN,
  xd1: Transformer<IN, R1>,
  xd2: Transformer<R1, R2>,
  xd3: Transformer<R2, R3>
): R3;
export function pipe<IN, R1, R2>(
  input: IN,
  xd1: Transformer<IN, R1>,
  xd2: Transformer<R1, R2>
): R2;
export function pipe<IN, R1>(input: IN, xd1: Transformer<IN, R1>): R1;
export function pipe<IN>(input: IN): IN;
export function pipe<IN, R>(
  input: IN,
  ...Transducers: Transformer<any, any>[]
): R;

export function pipe(input: any, ...transducers: any[]): any {
  return compose(...transducers)(input);
}
