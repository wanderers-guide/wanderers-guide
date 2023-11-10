import { DrawerType } from "@typing/index";
import { atom, selector } from "recoil";

const userIconState = atom({
  key: "user-svg-icon",
  default: null as string | null,
});


const _internal_drawerHistoryState = atom({
  key: 'drawer-history-internal',
  default: [] as { type: DrawerType, data: any }[]
});

const _internal_drawerState = atom({
  key: 'drawer-state-internal',
  default: null as {
    type: DrawerType;
    data: any;
    extra?: { addToHistory: boolean; history?: { type: DrawerType; data: any }[] };
  } | null,
});

const drawerState = selector({
  key: 'drawer-state',
  get: ({ get }) => {
    const drawer = get(_internal_drawerState);
    const history = get(_internal_drawerHistoryState);

    if (drawer && drawer.extra?.addToHistory) {
      return {
        ...drawer,
        extra: {
          ...drawer.extra,
          history,
        },
      };
    } else {
      return drawer;
    }
  },
  set: ({ set, get }, newValue) => {
    const drawer = get(_internal_drawerState);
    const history = get(_internal_drawerHistoryState);

    if (newValue) {
      if (drawer && drawer.extra?.addToHistory) {
        set(_internal_drawerHistoryState, [...history, { type: drawer.type, data: drawer.data }]);
      }
    } else {
      set(_internal_drawerHistoryState, []);
    }
    set(_internal_drawerState, newValue);
  },
});


export { userIconState, drawerState };
