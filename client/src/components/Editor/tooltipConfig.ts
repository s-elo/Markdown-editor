import { tooltip, tooltipPlugin } from "@milkdown/plugin-tooltip";

export default tooltip.configure(tooltipPlugin, {
  link: {
    placeholder: "Please input link...",
    buttonText: "Confirm",
  },
  image: {
    placeholder: "Please input image link...",
    buttonText: "OK",
  },
  inlineMath: {
    placeholder: "Please input inline math...",
  },
});
