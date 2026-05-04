import { tryParseInteger } from "@ark/util";
import { terminatingChars } from "../tokens.js";
export const parseDivisor = (s) => {
    s.scanner.shiftUntilNonWhitespace();
    const divisorToken = s.scanner.shiftUntilLookahead(terminatingChars);
    const divisor = tryParseInteger(divisorToken, {
        errorOnFail: writeInvalidDivisorMessage(divisorToken)
    });
    if (divisor === 0)
        s.error(writeInvalidDivisorMessage(0));
    s.root = s.root.constrain("divisor", divisor);
};
export const writeInvalidDivisorMessage = (divisor) => `% operator must be followed by a non-zero integer literal (was ${divisor})`;
