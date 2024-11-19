import globals from "globals";
import prettier from "eslint-plugin-prettier";  // Import plugin Prettier

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ["**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: globals.browser, // Menambahkan global untuk browser
    },
    plugins: {
      prettier,  // Menyertakan plugin Prettier dalam objek plugins
    },
    rules: {
      "no-console": "off",
      "prettier/prettier": "error", // Menambahkan aturan Prettier
    },
  },
];
