module.exports = {
  extends: ['@mintlify/eslint-config-typescript'],
  // TODO: remove these warn overrides and fix errors
  rules: {
    '@typescript-eslint/no-floating-promises': 'warn',
    '@typescript-eslint/no-unnecessary-condition': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
  },
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: './tsconfig.json',
  },
  ignorePatterns: ['.eslintrc.cjs', 'bin'],
};
