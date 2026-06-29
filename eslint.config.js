// ESLint flat config.
// 只 lint src/ 下的 TS；flatc 生成的 src/story-content/ 和测试 JSON 不纳入。

import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';

export default [
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: { ecmaVersion: 2021, sourceType: 'module' },
    },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      ...tseslint.configs.recommended.rules,
      // Worker 入口导出 default，handler 模块导出顶层 const，关掉这些告警
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-unused-vars': 'off',
      // 数组下标访问在 reader 渲染里是正常的
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    ignores: ['node_modules/**', '.wrangler/**', 'dist/**', 'src/story-content/**', 'src/story-content.ts', 'tmp/**', 'test/**'],
  },
  prettier,
];
