// Static code analysis for the API (Part 3).
// eslint-plugin-security looks for patterns that often lead to security bugs
// in Node.js: unsafe regular expressions (ReDoS), eval, child_process, non
// literal file paths, timing-unsafe comparisons and object-injection sinks.
// The pipeline fails if any rule reports an error.
const js = require('@eslint/js');
const globals = require('globals');
const security = require('eslint-plugin-security');

module.exports = [
  { ignores: ['node_modules/**', 'coverage/**', 'logs/**', 'certs/**'] },
  js.configs.recommended,
  security.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^(req|res|next|_)', ignoreRestSiblings: true }],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      eqeqeq: ['error', 'always'],
      'no-console': 'warn',
      // Every security rule is an error, so the pipeline stops on a finding.
      'security/detect-object-injection': 'error',
      'security/detect-non-literal-regexp': 'error',
      'security/detect-non-literal-fs-filename': 'error',
      'security/detect-unsafe-regex': 'error',
      'security/detect-possible-timing-attacks': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-child-process': 'error',
      'security/detect-pseudoRandomBytes': 'error',
    },
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: { globals: { ...globals.node, ...globals.jest } },
  },
  {
    // Command-line scripts and the health check talk to the operator on purpose.
    files: ['scripts/**/*.js', 'healthcheck.js'],
    rules: { 'no-console': 'off' },
  },
];
