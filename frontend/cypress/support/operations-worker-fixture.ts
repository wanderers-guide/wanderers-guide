/** Identify the real calculation worker without intercepting unrelated app workers. */
export function isOperationsWorkerURL(url: string | URL, baseURL: string): boolean {
  return /\/operations\.worker(?:\.(?:ts|js)|-[A-Za-z0-9_-]+\.js)$/.test(new URL(String(url), baseURL).pathname);
}
