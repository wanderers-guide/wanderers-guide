export const DEBUG_MODE = import.meta.env.VITE_ENV === 'development'; // || true;

export const DEBOUNCE_DELAY = 200; // ms

export const TEXT_INDENT_AMOUNT = 20; // px

export const EDIT_MODAL_HEIGHT = 530; // px

export const CHARACTER_BUILDER_BREAKPOINT = 815; // px
export const CHARACTER_SHEET_BREAKPOINT = 815; // px

export const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
export const URL_REGEX =
  /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/;

export const SITE_NAME = "Wanderer's Guide";

export const GUIDE_BLUE = '#359fdf';

export const IMPRINT_BG_COLOR = 'var(--imprint-bg-color)';
export const IMPRINT_BG_COLOR_HOVER = 'var(--imprint-bg-color-hover)';
export const IMPRINT_BORDER_COLOR = 'var(--imprint-border-color)';

export const COMMON_CORE_ID = 3;
export const PATHFINDER_CORE_ID = 1;
export const STARFINDER_CORE_ID = 579;

export const CHARACTER_SLOT_CAP = 6;
export const CAMPAIGN_SLOT_CAP = 1;
export const GM_GROUP_SIZE_CAP = 99;
