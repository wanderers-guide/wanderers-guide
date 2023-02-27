import { createApp } from "vue";
import "./index.css";
import App from "./App.vue";
import { router } from "./router";
import { createPinia } from "pinia";

const app = createApp(App);

const pinia = createPinia();
app.use(pinia);

app.use(router);

app.mount("#app");

// fetch this from some socket or endpoint:
const enabledLightMode = false;

// until we have tailwind/better bem, this is our conditional stylesheet imports:
if (enabledLightMode) {
  var element = document.createElement("link");
  element.setAttribute("rel", "stylesheet");
  element.setAttribute("type", "text/css");
  element.setAttribute("href", "/css/core/site-themes-light.css");
  document.getElementsByTagName("head")[0].appendChild(element);
} else {
  var element = document.createElement("link");
  element.setAttribute("rel", "stylesheet");
  element.setAttribute("type", "text/css");
  element.setAttribute("href", "/css/core/site-themes-dark.css");
  document.getElementsByTagName("head")[0].appendChild(element);
}
