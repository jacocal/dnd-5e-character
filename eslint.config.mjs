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
    // Generated KMP / Gradle / worker / Next.js validator artifacts:
    "shared/build/**",
    "server/build/**",
    "kotlin-js-store/**",
    "types/**",
    "public/worker.js",
    "public/sqlite.worker.js",
    ".gitnexus/**",
    "bundle-worker.js",
    "zod-check.ts",
  ]),
  {
    rules: {
      // KMP-exported JS interop objects frequently cross TS boundaries dynamically; surface as warnings
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
]);

export default eslintConfig;
