import { AbilityBlockType, ContentType, Creature } from '@schemas/content';
import { DrawerType } from '@schemas/index';
import { atom } from 'jotai';

const userIconState = atom(null as string | null);

const _internal_drawerHistoryState = atom([] as { type: DrawerType; data: any }[]);

type DrawerStateValue = {
  type: DrawerType;
  data: any;
  extra?: { addToHistory?: boolean; history?: { type: DrawerType; data: any }[] };
} | null;

const _internal_drawerState = atom(null as DrawerStateValue);

const drawerState = atom(
  (get) => {
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
  (get, set, newValue: DrawerStateValue) => {
    const drawer = get(_internal_drawerState);
    const history = get(_internal_drawerHistoryState);

    // If new value is null, reset everything
    if (!newValue) {
      set(_internal_drawerHistoryState, []);
      set(_internal_drawerState, null);
      return;
    }

    // Add new value to history or replace history
    if (newValue.extra?.addToHistory && drawer) {
      // Add new value to history
      set(_internal_drawerHistoryState, [...history, { type: drawer.type, data: drawer.data }]);
    } else if (newValue.extra?.history) {
      // Set history to new value's history
      set(_internal_drawerHistoryState, newValue.extra.history);
    }
    set(_internal_drawerState, newValue);
  }
);

const feedbackState = atom(
  null as {
    type: ContentType | AbilityBlockType;
    data: { id?: number; contentSourceId?: number };
  } | null
);

const creatureDrawerState = atom(
  null as {
    data: {
      id?: number;
      creature?: Creature;
      STORE_ID?: string;
      showOperations?: boolean;
      updateCreature?: (creature: Creature) => void;
      readOnly?: boolean;
    };
  } | null
);

export { userIconState, drawerState, feedbackState, creatureDrawerState };
