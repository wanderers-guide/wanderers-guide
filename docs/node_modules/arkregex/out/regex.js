export const regex = ((src, flags) => new RegExp(src, flags));
Object.assign(regex, { as: regex });
