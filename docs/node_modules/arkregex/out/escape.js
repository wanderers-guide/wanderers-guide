export const trailingBackslashMessage = "A regex cannot end with \\";
export const writeUnresolvableBackreferenceMessage = (ref) => `Group ${ref} does not exist`;
export const missingBackreferenceNameMessage = "\\k must be followed by a named reference like <name>";
export const writeInvalidUnicodePropertyMessage = (char) => `\\${char} must be followed by a property like \\${char}{Emoji_Presentation}`;
export const writeUnnecessaryEscapeMessage = (char) => `Escape preceding ${char} is unnecessary and should be removed.`;
// we have to add extra backslashes to the runtime variants of these
// so that attest can compare them correctly to their type-level equivalents
// the runtime variants are only used for the tests
export const writeStringEscapableMessage = (char) => `\\${char} should be specified with a single backslash like regex('\\n')`;
export const caretNotationMessage = "\\\\cX notation is not supported. Use hex (\\\\x) or unicode (\\\\u) instead.";
