import { gfm, codeFence } from "@milkdown/preset-gfm";

const languageOptions = [
  "",
  "javascript",
  "typescript",
  "html",
  "css",
  "bash",
  "jsx",
  "tsx",
  "sql",
  "json",
  "c",
  "cpp",
  "java",
  "ruby",
  "python",
  "go",
  "rust",
  "markdown",
];

export default gfm.configure(codeFence, {
  languageList: languageOptions,
});
