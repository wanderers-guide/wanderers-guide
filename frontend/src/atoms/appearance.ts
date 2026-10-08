import { atomWithStorage, createJSONStorage, unstable_withStorageValidator as withStorageValidator } from 'jotai/utils';
import { z } from 'zod';
import { COLOR_SCHEME_STORAGE_KEY } from '@constants/appearance';

const ColorSchemeSchema = z.enum(['dark', 'light']);
export type ColorScheme = z.infer<typeof ColorSchemeSchema>;
const jsonStorage = withStorageValidator((value): value is ColorScheme => ColorSchemeSchema.safeParse(value).success)(
  createJSONStorage<unknown>()
);

/** Storage restrictions affect persistence only; the current tab can still change appearance. */
const schemeStorage: typeof jsonStorage = {
  getItem(key, initialValue) {
    try {
      return jsonStorage.getItem(key, initialValue);
    } catch {
      console.warn('Appearance preference could not be read.');
      return initialValue;
    }
  },
  setItem(key, value) {
    try {
      jsonStorage.setItem(key, value);
    } catch {
      console.warn('Appearance preference could not be saved.');
    }
  },
  removeItem(key) {
    try {
      jsonStorage.removeItem(key);
    } catch {
      console.warn('Appearance preference could not be cleared.');
    }
  },
  subscribe(key, callback, initialValue) {
    try {
      return (
        jsonStorage.subscribe?.(
          key,
          (value) => {
            const parsed = ColorSchemeSchema.safeParse(value);
            callback(parsed.success ? parsed.data : initialValue);
          },
          initialValue
        ) ?? (() => {})
      );
    } catch {
      console.warn('Appearance preference could not be observed.');
      return () => {};
    }
  },
};

/** Viewer preference on this device, independent of account and character customization. */
export const colorSchemeAtom = atomWithStorage<ColorScheme>(COLOR_SCHEME_STORAGE_KEY, 'dark', schemeStorage, {
  getOnInit: true,
});
