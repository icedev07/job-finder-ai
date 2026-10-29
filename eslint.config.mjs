import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Prisma client output and the unbundled Chrome extension.
    'generated/**',
    'extension/**',
  ]),
  {
    rules: {
      // The scrapers and API routes use `any` at JSON and catch boundaries on purpose.
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
]);

export default eslintConfig;
