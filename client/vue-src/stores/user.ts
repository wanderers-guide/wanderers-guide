import { defineStore } from "pinia";
import axios from "axios";

interface user {
  createdAt: string;
  enabledLightMode: 0 | 1;
  googleID: string;
  id: number;
  isAdmin: 0 | 1;
  isDeveloper: 0 | 1;
  isPatreonLegend: 0 | 1;
  isPatreonMember: 0 | 1;
  isPatreonSupporter: 0 | 1;
  patreonAccessToken: null;
  patreonEmail: null;
  patreonFullName: null;
  patreonRefreshToken: null;
  patreonUserID: null;
  redditID: string;
  thumbnail: string;
  updatedAt: string;
  username: string;
}

export const useUser = defineStore("user", {
  state: (): {
    user: null | user;
    isLoaded: boolean;
  } => ({
    user: null,
    isLoaded: false,
  }),
  actions: {
    async load() {
      if (!this.isLoaded) {
        const userData = await axios.get("/vue-data/user");
        this.user = userData.data;
        this.isLoaded = true;
      }
    },
  },
});
