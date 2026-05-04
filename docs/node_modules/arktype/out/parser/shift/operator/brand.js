import { terminatingChars } from "../tokens.js";
export const parseBrand = (s) => {
    s.scanner.shiftUntilNonWhitespace();
    const brandName = s.scanner.shiftUntilLookahead(terminatingChars);
    s.root = s.root.brand(brandName);
};
