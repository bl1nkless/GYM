import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Prettier должен быть последним для отключения конфликтующих правил
  prettier,
  // Кастомные правила
  {
    rules: {
      // TypeScript строгие правила
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // React правила
      "react-hooks/exhaustive-deps": "warn",

      // Общие правила
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "warn",
      "no-var": "error",
      eqeqeq: ["error", "always", { null: "ignore" }],
    },
  },
  // Игнорируемые файлы
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/types/database.types.ts",
  ]),
]);

export default eslintConfig;
