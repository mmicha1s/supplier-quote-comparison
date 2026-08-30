export default [
  {
    ignores: ["node_modules/**"]
  },
  {
    files: ["app/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        fetch: "readonly",
        sap: "readonly"
      }
    },
    rules: {
      "no-unused-vars": "error",
      "no-undef": "error"
    }
  },
  {
    files: ["srv/**/*.js", "test/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        SELECT: "readonly",
        UPDATE: "readonly",
        __dirname: "readonly",
        describe: "readonly",
        it: "readonly"
      }
    },
    rules: {
      "no-unused-vars": "error",
      "no-undef": "error"
    }
  }
]
