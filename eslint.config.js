import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'

export default [
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },

  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],

  {
    files: ['**/*.{js,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser }
    },
    rules: {
      // Correctness
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      'eqeqeq': ['error', 'smart'],
      'no-var': 'error',
      'prefer-const': 'error',

      // Single-word view names (Pos, Login, Settings) are fine here
      'vue/multi-word-component-names': 'off',

      // Pure formatting rules: not enforced (no formatter is set up)
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/multiline-html-element-content-newline': 'off',
      'vue/html-self-closing': 'off',
      'vue/html-indent': 'off',
      'vue/html-closing-bracket-newline': 'off',
      'vue/first-attribute-linebreak': 'off',
      'vue/attributes-order': 'off'
    }
  },

  // Node-side config files and tests
  {
    files: ['*.config.{js,cjs}', 'tests/**/*.js'],
    languageOptions: { globals: { ...globals.node } }
  },
  {
    files: ['tailwind.config.js'],
    languageOptions: { sourceType: 'commonjs', globals: { ...globals.node } }
  }
]
