import { GUIDE_BLUE } from '@constants/data';
import { generateColors } from '@mantine/colors-generator';

export function resolveThemeColor(color?: string) {
  if (!color) return GUIDE_BLUE;

  try {
    generateColors(color);
    return color;
  } catch {
    return GUIDE_BLUE;
  }
}

export function generateThemeColors(color?: string) {
  return generateColors(resolveThemeColor(color));
}
