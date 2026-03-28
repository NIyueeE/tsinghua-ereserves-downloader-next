import eslintConfigPrettier from "eslint-config-prettier";

/** @type {import("eslint").Linter.FlatConfig[]} */
export default [
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        // Tampermonkey globals
        GM_addStyle: "readonly",
        GM_deleteValue: "readonly",
        GM_getResourceText: "readonly",
        GM_getValue: "readonly",
        GM_info: "readonly",
        GM_listValues: "readonly",
        GM_log: "readonly",
        GM_notification: "readonly",
        GM_openInTab: "readonly",
        GM_registerMenuCommand: "readonly",
        GM_removeValueChangeListener: "readonly",
        GM_setValue: "readonly",
        GM_unregisterMenuCommand: "readonly",
        GM_xmlhttpRequest: "readonly",
        GM_download: "readonly",
        GM_getTab: "readonly",
        GM_getTabs: "readonly",
        GM_saveTab: "readonly",
        GM_setClipboard: "readonly",
        GM_addValueChangeListener: "readonly",
        // Browser globals
        document: "readonly",
        window: "readonly",
        console: "readonly",
        Promise: "readonly",
        MutationObserver: "readonly",
        AbortController: "readonly",
        AbortSignal: "readonly",
        Image: "readonly",
        Blob: "readonly",
        URL: "readonly",
        atob: "readonly",
        btoa: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        fetch: "readonly",
        location: "readonly",
        DOMException: "readonly",
        jspdf: "readonly",
      },
    },
    rules: {
      // Error prevention
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-implicit-globals": "error",
      "no-new": "off", // Allow `new Image()` etc.
      // Specific patterns used in this codebase
      "no-undef": "error",
    },
  },
  // Disable rules that conflict with Prettier
  eslintConfigPrettier,
];
