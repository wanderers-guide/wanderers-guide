import _ from "lodash";

export function sign(num: number | string): string {
  num = _.isString(num) ? parseInt(num) : num;
  return num < 0 ? `${num}` : `+${num}`;
}

