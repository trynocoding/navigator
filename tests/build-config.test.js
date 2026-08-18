import test from 'node:test';
import assert from 'node:assert/strict';

import config from '../vite.config.js';

test('扩展构建使用稳定资源名，避免 Chrome 缓存旧 HTML 后入口脚本失效', () => {
  const output = config.build?.rollupOptions?.output;
  assert.equal(output?.entryFileNames, 'assets/[name].js');
  assert.equal(output?.chunkFileNames, 'assets/[name].js');
  assert.equal(output?.assetFileNames, 'assets/[name][extname]');
});
