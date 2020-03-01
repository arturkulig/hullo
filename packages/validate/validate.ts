export type ObjectSpec<T> = {
  [id in keyof T]: Validator<T[id]>;
};

export type Validator<T> = (v: unknown) => v is T;

export function isAny(_v: unknown): _v is unknown {
  return true;
}

export function isObject<T extends object>(
  spec: ObjectSpec<T>,
  unspecifiedPropertiesAllowed = true
): Validator<T> {
  return function isObject_(v: unknown): v is T {
    if (typeof v !== "object" || v == null) {
      return false;
    }
    for (let key in spec) {
      if (key in v) {
        const validator = spec[key];
        const value = (v as any)[key];
        if (!validator(value)) {
          return false;
        }
      } else {
        return false;
      }
    }
    if (!unspecifiedPropertiesAllowed) {
      const specKeys = Object.keys(spec);
      for (let vKey in v) {
        if (!specKeys.includes(vKey)) {
          return false;
        }
      }
    }
    return true;
  };
}

export function isArray<T>(validator: Validator<T>): Validator<Array<T>> {
  return function isArray_(v: unknown): v is Array<T> {
    if (!Array.isArray(v)) {
      return false;
    }
    for (const item of v) {
      if (!validator(item)) {
        return false;
      }
    }
    return true;
  };
}

export function isTuple<T1>(validator1: Validator<T1>): Validator<[T1]>;
export function isTuple<T1, T2>(
  validator1: Validator<T1>,
  validator2: Validator<T2>
): Validator<[T1, T2]>;
export function isTuple<T1, T2, T3>(
  validator1: Validator<T1>,
  validator2: Validator<T2>,
  validator3: Validator<T3>
): Validator<[T1, T2, T3]>;
export function isTuple<T1, T2, T3, T4>(
  validator1: Validator<T1>,
  validator2: Validator<T2>,
  validator3: Validator<T3>,
  validator4: Validator<T4>
): Validator<[T1, T2, T3, T4]>;
export function isTuple<T1, T2, T3, T4, T5>(
  validator1: Validator<T1>,
  validator2: Validator<T2>,
  validator3: Validator<T3>,
  validator4: Validator<T4>,
  validator5: Validator<T5>
): Validator<[T1, T2, T3, T4, T5]>;
export function isTuple<T>(...validators: Validator<T>[]): Validator<T[]>;
export function isTuple(...validators: Validator<any>[]): Validator<any> {
  return function isTuple_(v: unknown): v is any[] {
    if (!Array.isArray(v) || validators.length !== v.length) {
      return false;
    }
    for (let i = 0; i < validators.length; i++) {
      if (!validators[i](v[i])) {
        return false;
      }
    }
    return true;
  };
}

export function isNullable<T>(validator: Validator<T>): Validator<T | null> {
  return isEither(isNull, validator);
}

export function isOptional<T>(
  validator: Validator<T>
): Validator<T | null | undefined> {
  return isEither(isUndefined, isNull, validator);
}

export function isEither<T1, T2>(
  validator1: Validator<T1>,
  validator2: Validator<T2>
): Validator<T1 | T2>;
export function isEither<T1, T2, T3>(
  validator1: Validator<T1>,
  validator2: Validator<T2>,
  validator3: Validator<T3>
): Validator<T1 | T2 | T3>;
export function isEither<T1, T2, T3, T4>(
  validator1: Validator<T1>,
  validator2: Validator<T2>,
  validator3: Validator<T3>,
  validator4: Validator<T4>
): Validator<T1 | T2 | T3 | T4>;
export function isEither<T1, T2, T3, T4, T5>(
  validator1: Validator<T1>,
  validator2: Validator<T2>,
  validator3: Validator<T3>,
  validator4: Validator<T4>,
  validator5: Validator<T5>
): Validator<T1 | T2 | T3 | T4 | T5>;
export function isEither<T>(...validators: Validator<T>[]): Validator<T>;
export function isEither<T>(...validators: Validator<T>[]): Validator<T> {
  return function isNullable_(v: unknown): v is T {
    for (const validator of validators) {
      if (validator(v)) {
        return true;
      }
    }
    return false;
  };
}

export const isString: Validator<string> = function isString_(
  v: unknown
): v is string {
  return typeof v === "string";
};

export function isStringOf<T extends string>(expected: T): Validator<T> {
  return function isStringOf_(v: unknown): v is T {
    return v === expected;
  };
}

export const isNumber: Validator<number> = function isNumber_(
  v: unknown
): v is number {
  return typeof v === "number";
};

export function isNumberOf<T extends number>(expected: T): Validator<T> {
  return function isNumberOf_(v: unknown): v is T {
    return v === expected;
  };
}

export const isBigInt: Validator<bigint> = function isBigInt_(
  v: unknown
): v is bigint {
  return typeof v === "bigint";
};

export const isBoolean: Validator<boolean> = function isBoolean_(
  v: unknown
): v is boolean {
  return typeof v === "boolean";
};

export const isTrue: Validator<boolean> = function isTrue_(
  v: unknown
): v is true {
  return v === true;
};

export const isFalse: Validator<boolean> = function isFalse_(
  v: unknown
): v is false {
  return v === false;
};

export const isNull: Validator<null> = function isNull_(v: unknown): v is null {
  return v === null;
};

export const isUndefined: Validator<undefined> = function isUndefined_(
  v: unknown
): v is undefined {
  return v === undefined;
};

export const isSymbol: Validator<symbol> = function isSymbol_(
  v: unknown
): v is symbol {
  return typeof v === "symbol";
};

export const isNever: Validator<never> = function isNever_(
  _v: unknown
): _v is never {
  return false;
};
