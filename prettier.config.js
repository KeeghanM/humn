const config = {
  plugins: ["@trivago/prettier-plugin-sort-imports"],
  semi: false,
  singleQuote: true,
  importOrder: [
    "<THIRD_PARTY_MODULES>",
    "^[./]", // Other imports
  ],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
};

export default config;
