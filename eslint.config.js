const { defineConfig } = require('eslint/config')
const expo = require('eslint-config-expo/flat')
const prettier = require('eslint-config-prettier/flat')

module.exports = defineConfig([
  expo,
  prettier,
  {
    ignores: ['dist/*', '.expo/*', 'supabase/*', '.agents/*', '.claude/*', 'node_modules/*'],
  },
  {
    // Security rule: never log tokens, emails or health data (AGENTS.md rule 3).
    files: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
    rules: {
      'no-console': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
])
