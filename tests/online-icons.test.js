import test from 'node:test';
import assert from 'node:assert/strict';

import {
  inferBrandSlugs,
  isSharpEnough,
  makeOnlineIconSources,
} from '../src/newtab/modules/online-icons.js';

test('在线候选拒绝会被放大的低清位图，但接受矢量和足够大的位图', () => {
  assert.equal(isSharpEnough({ width: 32, height: 32, vector: false }), false);
  assert.equal(isSharpEnough({ width: 64, height: 64, vector: false }), true);
  assert.equal(isSharpEnough({ width: 24, height: 24, vector: true }), true);
});

test('X 优先提供品牌矢量与高清网站图标，并准备清晰徽标补位', () => {
  const previousChrome = globalThis.chrome;
  globalThis.chrome = {
    runtime: { getURL: (path) => `chrome-extension://navigator/${path.replace(/^\//, '')}` },
  };
  try {
    const sources = makeOnlineIconSources('https://x.com/home', 'X');
    assert.deepEqual(
      sources.slice(0, 3).map(({ label }) => label),
      ['品牌矢量', '高清网站图标', '品牌徽标'],
    );
    assert.match(sources[0].url, /cdn\.simpleicons\.org\/x$/);
    assert.equal(sources[0].background, '#f8fafc');
    assert.match(sources[2].url, /cdn\.simpleicons\.org\/x\/fff$/);
    assert.equal(sources[2].background, '#111827');
    assert.equal(sources[3].label, '品牌卡片');
  } finally {
    globalThis.chrome = previousChrome;
  }
});

test('品牌别名与普通域名都能生成矢量图标查询词', () => {
  assert.deepEqual(inferBrandSlugs('chatgpt.com', 'ChatGPT'), ['openai', 'chatgpt']);
  assert.deepEqual(inferBrandSlugs('www.github.com', 'GitHub'), ['github']);
});
