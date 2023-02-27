import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      // There's probably a better way to do this, but I don't know my way around proxies well enough!
      "/vue-data": {
        target: "http://localhost:3000",
        changeOrigin: false,
        secure: false,
        ws: true,
      },
      // There's probably a better way to do this, but I don't know my way around proxies well enough!
      "^(?!(/v/)|(.*vue)|(.*vite)).*": {
        target: "http://localhost:3000",
        changeOrigin: false,
        secure: false,
        ws: true,
      },
    },
  },
});
