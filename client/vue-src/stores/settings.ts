import { defineStore } from "pinia";

export const useSettings = defineStore("characters", {
  state: () => ({
    darkMode: false,
  }),
  actions: {
    set({ darkMode }: { darkMode: boolean }) {
      this.darkMode = darkMode;
    },
  },
});
