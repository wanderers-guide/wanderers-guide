import { atom } from "recoil";

const backgroundState = atom({
  key: "nav-background",
  default: 0 as number | null,
});

const userIconState = atom({
  key: "user-svg-icon",
  default: null as string | null,
});

export { backgroundState, userIconState };
