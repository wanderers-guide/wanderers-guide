import { CHARACTER_BUILDER_BREAKPOINT } from '@constants/data';

export function isCharacterBuilderMobile() {
  return window.innerWidth <= CHARACTER_BUILDER_BREAKPOINT;
}
