import {
  isObject,
  isArray,
  isTuple,
  isAny,
  isBigInt,
  isBoolean,
  isNull,
  isNumber,
  isString,
  isSymbol,
  isUndefined,
  isEither,
  isNullable,
  isOptional,
  isNumberOf,
  isTrue,
  isFalse,
  isStringOf
} from "./validate";

describe("validate validates", () => {
  it("Undefined", () => {
    expect(isUndefined(undefined)).toBeTruthy();
    expect(isUndefined(null)).toBeFalsy();
    expect(isUndefined(1)).toBeFalsy();
  });

  it("Object", () => {
    expect(isObject({})(undefined)).toBeFalsy();
    expect(isObject({ x: isAny })(undefined)).toBeFalsy();
    expect(isObject({ x: isString })(undefined)).toBeFalsy();
    expect(isObject({ x: isString })({})).toBeFalsy();
    expect(isObject({ x: isString })({ x: "x" })).toBeTruthy();
    expect(isObject({ x: isString })({ x: "x", y: 1 })).toBeTruthy();
    expect(isObject({ x: isString }, false)({ x: "x" })).toBeTruthy();
    expect(isObject({ x: isString }, false)({ x: "x", y: 1 })).toBeFalsy();
  });

  it("Array", () => {
    expect(isArray(isAny)(undefined)).toBeFalsy();
    expect(isArray(isAny)([])).toBeTruthy();
    expect(isArray(isString)([])).toBeTruthy();
    expect(isArray(isString)(["2", "3"])).toBeTruthy();
    expect(isArray(isString)(["2", "3", 3])).toBeFalsy();
  });

  it("Tuple", () => {
    expect(isTuple()(undefined)).toBeFalsy();
    expect(isTuple()([])).toBeTruthy();
    expect(isTuple(isString)([])).toBeFalsy();
    expect(isTuple(isString)(["x"])).toBeTruthy();
    expect(isTuple(isString, isBoolean)(["x", true])).toBeTruthy();
    expect(isTuple(isString, isNumber)(["x", true])).toBeFalsy();
    expect(isTuple(isString, isNumber)(["x", 1, 1])).toBeFalsy();
  });

  it("Any", () => {
    expect(isAny(undefined)).toBeTruthy();
    expect(isAny(null)).toBeTruthy();
    expect(isAny(1)).toBeTruthy();
    expect(isAny("")).toBeTruthy();
  });

  it("BigInt", () => {
    expect(isBigInt(undefined)).toBeFalsy();
    expect(isBigInt(1n)).toBeTruthy();
  });

  it("Boolean", () => {
    expect(isBoolean(undefined)).toBeFalsy();
    expect(isBoolean(1)).toBeFalsy();
    expect(isBoolean(true)).toBeTruthy();
    expect(isBoolean(false)).toBeTruthy();
  });

  it("True", () => {
    expect(isTrue(undefined)).toBeFalsy();
    expect(isTrue(1)).toBeFalsy();
    expect(isTrue(true)).toBeTruthy();
    expect(isTrue(false)).toBeFalsy();
  });

  it("False", () => {
    expect(isFalse(undefined)).toBeFalsy();
    expect(isFalse(1)).toBeFalsy();
    expect(isFalse(true)).toBeFalsy();
    expect(isFalse(false)).toBeTruthy();
  });

  it("Null", () => {
    expect(isNull(undefined)).toBeFalsy();
    expect(isNull(0)).toBeFalsy();
    expect(isNull(false)).toBeFalsy();
    expect(isNull(null)).toBeTruthy();
  });

  it("Number", () => {
    expect(isNumber(undefined)).toBeFalsy();
    expect(isNumber(NaN)).toBeTruthy();
    expect(isNumber(1)).toBeTruthy();
  });

  it("Specific number", () => {
    expect(isNumberOf(1)(undefined)).toBeFalsy();
    expect(isNumberOf(1)(NaN)).toBeFalsy();
    expect(isNumberOf(1)(0)).toBeFalsy();
    expect(isNumberOf(1)(1)).toBeTruthy();
  });

  it("String", () => {
    expect(isString(undefined)).toBeFalsy();
    expect(isString("")).toBeTruthy();
    expect(isString("x")).toBeTruthy();
  });

  it("Specific string", () => {
    expect(isStringOf("x")(undefined)).toBeFalsy();
    expect(isStringOf("x")("")).toBeFalsy();
    expect(isStringOf("x")("x")).toBeTruthy();
  });

  it("Symbol", () => {
    expect(isSymbol(undefined)).toBeFalsy();
    expect(isSymbol(Symbol.iterator)).toBeTruthy();
  });

  it("either x or y", () => {
    expect(isEither(isString, isNumber)(undefined)).toBeFalsy();
    expect(isEither(isString, isNumber)(0)).toBeTruthy();
    expect(isEither(isString, isNumber)("0")).toBeTruthy();
    expect(isEither(isString, isNumber)({ x: 1 })).toBeFalsy();
  });

  it("nullable x", () => {
    expect(isNullable(isString)(undefined)).toBeFalsy();
    expect(isNullable(isString)("x")).toBeTruthy();
    expect(isNullable(isString)(null)).toBeTruthy();
    const x: unknown = "";
    if (isNullable(isString)(x)) {
      const y: string | null = x;
      expect(y).toBe("");
    }
  });

  it("optional x", () => {
    expect(isOptional(isString)(1)).toBeFalsy();
    expect(isOptional(isString)(undefined)).toBeTruthy();
    expect(isOptional(isString)("x")).toBeTruthy();
    expect(isOptional(isString)(null)).toBeTruthy();
    const x: unknown = "";
    if (isOptional(isString)(x)) {
      const y: string | null | undefined = x;
      expect(y).toBe("");
    }
  });
});
