import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";
import CharacterList from "./views/dashboard/character-list/character-list.vue";
import { useCharacters } from "./stores/characters";
import { useUser } from "./stores/user";

// 2. Define some routes
// Each route should map to a component.
// We'll talk about nested routes later.
const routes: RouteRecordRaw[] = [
  {
    path: "/profile/characters",
    component: CharacterList,
    beforeEnter: async () => {
      const userStore = useUser();
      const characterStore = useCharacters();
      await Promise.all([userStore.load(), characterStore.load()]);
      return true;
    },
  },
  {
    path: "/",
    component: CharacterList,
    beforeEnter: (to) => {
      const userStore = useUser();
      const characterStore = useCharacters();
      Promise.all([userStore.load(), characterStore.load()]);
      return false;
    },
  },
];

// 3. Create the router instance and pass the `routes` option
// You can pass in additional options here, but let's
// keep it simple for now.
export const router = createRouter({
  // 4. Provide the history implementation to use. We are using the hash history for simplicity here.
  history: createWebHistory('/v/'),
  routes, // short for `routes: routes`
});
