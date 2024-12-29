import { DrawerType } from '@typing/index';
import { isDefaultValue } from '@utils/type-fixing';
import { DefaultValue, atom, selector } from 'recoil';

const userIconState = atom({
  key: 'user-svg-icon',
  default: null as string | null,
});

const _internal_drawerHistoryState = atom({
  key: 'drawer-history-internal',
  default: [] as { type: DrawerType; data: any }[],
});

const _internal_drawerState = atom({
  key: 'drawer-state-internal',
  default: null as {
    type: DrawerType;
    data: any;
    extra?: { addToHistory?: boolean; history?: { type: DrawerType; data: any }[] };
  } | null,
});

const drawerState = selector({
  key: 'drawer-state',
  get: ({ get }) => {
    const drawer = get(_internal_drawerState);
    const history = get(_internal_drawerHistoryState);

    if (drawer) {
      return {
        ...drawer,
        extra: {
          history,
        },
      } as typeof drawer;
    } else {
      return null;
    }
  },
  set: ({ set, get }, newValue) => {
    const drawer = get(_internal_drawerState);
    const history = get(_internal_drawerHistoryState);

    // If new value is null, reset everything
    if (!newValue) {
      set(_internal_drawerHistoryState, []);
      set(_internal_drawerState, null);
      return;
    }

    // Add new value to history or replace history
    if (!isDefaultValue(newValue)) {
      if (newValue.extra?.addToHistory && drawer) {
        // Add new value to history
        set(_internal_drawerHistoryState, [...history, { type: drawer.type, data: drawer.data }]);
      } else if (newValue.extra?.history) {
        // Set history to new value's history
        set(_internal_drawerHistoryState, newValue.extra.history);
      }
    }
    set(_internal_drawerState, newValue);
  },
});

const drawerZIndexState = atom({
  key: 'drawer-z-index',
  default: null as number | null,
});

export { userIconState, drawerState, drawerZIndexState };
