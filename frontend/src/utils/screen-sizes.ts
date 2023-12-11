import { CHARACTER_BUILDER_BREAKPOINT, CHARACTER_SHEET_BREAKPOINT } from '@constants/data';

export function isCharacterBuilderMobile() {
  return window.innerWidth <= CHARACTER_BUILDER_BREAKPOINT;
}

export function isCharacterSheetMobile() {
  return window.innerWidth <= CHARACTER_SHEET_BREAKPOINT;
}
