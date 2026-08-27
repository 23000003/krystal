import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendor snippets kept for reference; they are not part of the build.
    "*-code-reference.ts",
    // The NestJS API is a separate project with its own lint config.
    "krystal-api/**",
  ]),
]);

export default eslintConfig;
