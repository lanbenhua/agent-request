/* eslint-disable @typescript-eslint/no-explicit-any */
export const parse = <T = any>(
  text: string,
  reviver?: (this: any, key: string, value: any) => any
): T | null => {
  try {
    return JSON.parse(text, reviver);
  } catch (e) {
    // TODO catch error and report error
    return null;
  }
};

export const stringify = (
  value: any,
  replacer?: (this: any, key: string, value: any) => any,
  space?: string | number
): string => {
  try {
    return JSON.stringify(value, replacer, space);
  } catch (e) {
    // TODO catch error and report error
    return '';
  }
};
