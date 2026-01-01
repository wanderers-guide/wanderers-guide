import { MantineStyleProp } from '@mantine/core';

/**
 * Get styles for anchoring an element to the specified position, taking into account safe area insets.
 * @param pos - An object specifying the top, bottom, left, and/or right positions in pixels.
 * @returns - A style object with the calculated positions.
 */
export function getAnchorStyles(pos: { t?: number; b?: number; l?: number; r?: number }): MantineStyleProp {
  const styles: MantineStyleProp = {
    position: 'fixed',
  };
  if (pos.t !== undefined) {
    styles.top = `calc(${pos.t}px + env(safe-area-inset-top))`;
  }
  if (pos.b !== undefined) {
    styles.bottom = `calc(${pos.b}px + env(safe-area-inset-bottom))`;
  }
  if (pos.l !== undefined) {
    styles.left = `calc(${pos.l}px + env(safe-area-inset-left))`;
  }
  if (pos.r !== undefined) {
    styles.right = `calc(${pos.r}px + env(safe-area-inset-right))`;
  }
  return styles;
}
