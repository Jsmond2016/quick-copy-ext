import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import reactPlugin from 'eslint-plugin-react';

const maxLinesRule = [
  'error',
  {
    max: 450,
    skipBlankLines: true,
    skipComments: true,
  },
];

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'watch.js'],
  },
  {
    files: ['**/*.{js,ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        chrome: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react: reactPlugin,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      'max-lines': maxLinesRule,
      'react/react-in-jsx-scope': 'off',
    },
  },
];
