export const writeDuplicateModifierMessage = (modifier) => `Modifier ${modifier} cannot appear multiple times in a single group`;
export const multipleModifierDashesMessage = "Modifiers can include at most one '-' to negate subsequent flags";
export const missingNegatedModifierMessage = `- must be followed by the modifier flag to negate ('i', 'm' or 's')`;
export const writeInvalidModifierMessage = (char) => `Modifier flag ${char} must be 'i', 'm' or 's'`;
export const unnamedCaptureGroupMessage = "Capture group <> requires a name";
export const unescapedLiteralQuestionMarkMessage = "literal ? must be escaped at the start of a group";
