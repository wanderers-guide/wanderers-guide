export function mobileQuery() {
  return tabletQuery();
}

export function tabletQuery() {
  return `(max-width: 64em)`;
}

export function phoneQuery() {
  return `(max-width: 36em)`;
}

export function wideDesktopQuery() {
  return `(min-width: 120em)`;
}

export function usePhoneSized<T = any>(inputUseElementSize: any): { boundRef: React.RefObject<T>; isPhone: boolean } {
  const { ref, width, height } = inputUseElementSize();
  return { boundRef: ref, isPhone: isPhoneSized(width) };
}

export function isPhoneSized(width: number): boolean {
  return width < 36 * 16;
}

export function isTabletSized(width: number): boolean {
  return width < 64 * 16;
}

export function isDesktopSized(width: number): boolean {
  return width >= 64 * 16;
}

export function isWideDesktopSized(width: number): boolean {
  return width >= 120 * 16;
}

export function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}
