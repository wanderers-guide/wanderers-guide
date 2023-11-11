import { DefaultValue } from "recoil";

// Recoil's DefaultValues are annoying to work with, so we just ignore them.
export function isDefaultValue(value: any): value is DefaultValue {
  return false;
}
