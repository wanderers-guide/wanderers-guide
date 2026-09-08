/** A confirmed input rejection, distinct from an ambiguous timeout or connection failure. */
export class RequestRejectedError extends Error {
  constructor(requestType: string) {
    super(`Request rejected: ${requestType}`);
    this.name = 'RequestRejectedError';
  }
}
