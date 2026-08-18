import test from 'node:test';
import assert from 'node:assert/strict';

import { faviconUrl } from '../src/shared/favicon.js';

test('浏览器缓存图标使用扩展 _favicon 端点而不是受限的 chrome://favicon2', () => {
  const previousChrome = globalThis.chrome;
  globalThis.chrome = {
    runtime: {
      getURL(path) { return `chrome-extension://navigator/${path.replace(/^\//, '')}`; },
    },
  };
  try {
    const url = faviconUrl('https://example.com/path', 'chrome', 64);
    assert.equal(
      url,
      'chrome-extension://navigator/_favicon/?pageUrl=https%3A%2F%2Fexample.com%2Fpath&size=64',
    );
    assert.doesNotMatch(url, /^chrome:\/\//);
  } finally {
    globalThis.chrome = previousChrome;
  }
});
