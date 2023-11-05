import { atom } from "recoil";

const userIconState = atom({
  key: "user-svg-icon",
  default: null as string | null,
});

export { userIconState };
