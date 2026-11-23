import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'playwright-report', 'test-results', 'supabase'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.strict],
    languageOptions: { ecmaVersion: 2023, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@supabase/supabase-js',
              message: 'Use o cliente de @/lib/supabase dentro de features/<módulo>/api.',
            },
          ],
        },
      ],
    },
  },
  {
    // Só a camada api/ (e o próprio cliente) pode falar com o Supabase.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/features/*/api/**', 'src/lib/supabase.ts', 'src/lib/database.types.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: '@supabase/supabase-js', message: 'Supabase só em features/<módulo>/api.' },
            { name: '@/lib/supabase', message: 'Supabase só em features/<módulo>/api.' },
          ],
        },
      ],
    },
  },
  {
    files: ['src/lib/supabase.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    files: ['*.config.ts', 'e2e/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
  prettier,
);
