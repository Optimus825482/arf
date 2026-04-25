import { FlatCompat } from "@eslint/eslintrc";
import path from "node:path";
import { fileURLToPath } from "node:url";
import firebaseRulesPlugin from "@firebase/eslint-plugin-security-rules";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const config = [
  { ignores: ["dist/**/*", ".next/**/*", "node_modules/**/*", "next-env.d.ts", "public/**/*"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  firebaseRulesPlugin.configs["flat/recommended"],
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "react/no-unescaped-entities": "warn",
      "prefer-const": "warn",
      "@typescript-eslint/triple-slash-reference": "off",
    },
  },
];

export default config;
