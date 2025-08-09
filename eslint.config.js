// ESLint Flat Config
import js from '@eslint/js'
import globals from 'globals'

export default [
  // Ignore generated and external files
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      '.github/**'
    ]
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        // Vite define globals
        __APP_NAME__: 'readonly',
        __APP_VERSION__: 'readonly',
        __APP_DESCRIPTION__: 'readonly',
        __BUILD_DATE__: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'prefer-const': 'warn',
      // Enforce Vitest-only usage (prevent accidental Jest usage)
      'no-restricted-globals': [
        'error',
        { name: 'jest', message: 'Use Vitest (vi) APIs instead of Jest.' }
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'jest',
              message: 'Use vitest instead of jest.'
            }
          ]
        }
      ]
    }
  },
  // Test files: provide Vitest globals
  {
    files: ['**/*.test.js', '**/*.spec.js', 'test/**', 'tests/**'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
  vi: 'readonly',
  gc: 'readonly'
      }
    },
    rules: {
  'no-unused-vars': 'off',
  'prefer-const': 'off',
      // Also forbid importing jest in test files explicitly
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'jest',
              message: 'Use vitest instead of jest.'
            }
          ]
        }
      ]
    }
  }
]
