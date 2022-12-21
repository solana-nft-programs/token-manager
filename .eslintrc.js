module.exports = {
  root: true,
  ignorePatterns: ["dist/", "*.js", "api/"],
  parser: "@typescript-eslint/parser",
  plugins: ["simple-import-sort", "import", "unused-imports"],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: "tsconfig.json",
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:prettier/recommended",
  ],
  env: {
    node: true,
  },
  rules: {
    eqeqeq: "warn",
    "@typescript-eslint/explicit-member-accessibility": [
      "error",
      { accessibility: "no-public" },
    ],
    "import/order": "off",
    "simple-import-sort/imports": "warn",
    "simple-import-sort/exports": "warn",
    "import/first": "warn",
    "import/newline-after-import": "warn",
    "import/no-duplicates": "warn",
    "unused-imports/no-unused-imports": "error",
    "@typescript-eslint/consistent-type-imports": "error",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        vars: "all",
        varsIgnorePattern: "^_",
        args: "after-used",
        argsIgnorePattern: "^_",
      },
    ],
    "@typescript-eslint/naming-convention": [
      "error",
      {
        selector: "memberLike",
        modifiers: ["private"],
        format: ["camelCase"],
        leadingUnderscore: "require",
      },
    ],
  },
};
