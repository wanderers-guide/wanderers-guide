export function throwError(message: string, debugOnly?: boolean) {
  if (debugOnly) return;

  logError(message);
  throw new Error(message);
}

export function logError(message: string, debugOnly?: boolean) {
  if (debugOnly) return;

  console.error(`Error: ${message}`);
}
