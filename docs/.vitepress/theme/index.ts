import DefaultTheme from "vitepress/theme";
import { h } from "vue";
import DocActions from "./components/DocActions.vue";
import "./style.css";

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      "aside-outline-before": () => h(DocActions),
    });
  },
};
