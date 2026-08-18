import test from 'node:test';
import assert from 'node:assert/strict';

import {
  aggregateByOrigin,
  rankOrigins,
  selectHistoryCandidates,
} from '../src/shared/scorer.js';

test('候选选择会保留高频但不够近期的网站', () => {
  const now = Date.now();
  const recentLowFrequency = Array.from({ length: 20 }, (_, index) => ({
    url: `https://recent-${index}.test/`,
    title: `Recent ${index}`,
    visitCount: 1,
    lastVisitTime: now - index * 1000,
  }));
  const frequentOlder = {
    url: 'https://frequent.test/',
    title: 'Frequent',
    visitCount: 120,
    lastVisitTime: now - 20 * 86400000,
  };

  const selected = selectHistoryCandidates(
    [...recentLowFrequency, frequentOlder],
    { maxOrigins: 5, maxUrlsPerOrigin: 2, frequencyShare: 0.6 },
  );

  assert.ok(selected.some((item) => item.url === frequentOlder.url));
});

test('单个网站不会挤占全部候选 URL', () => {
  const now = Date.now();
  const noisyOrigin = Array.from({ length: 12 }, (_, index) => ({
    url: `https://noisy.test/page-${index}`,
    visitCount: 100 - index,
    lastVisitTime: now - index,
  }));
  const otherOrigins = Array.from({ length: 5 }, (_, index) => ({
    url: `https://other-${index}.test/`,
    visitCount: 20 - index,
    lastVisitTime: now - index,
  }));

  const selected = selectHistoryCandidates(
    [...noisyOrigin, ...otherOrigins],
    { maxOrigins: 4, maxUrlsPerOrigin: 2 },
  );

  assert.equal(selected.filter((item) => item.origin === 'https://noisy.test').length, 2);
  assert.equal(new Set(selected.map((item) => item.origin)).size, 4);
});

test('推荐标题按实际访问次数加权，而不是按 URL 数量投票', () => {
  const now = Date.now();
  const aggregated = aggregateByOrigin([
    {
      url: 'https://product.test/',
      title: 'Product',
      visitTimes: Array.from({ length: 8 }, (_, index) => now - index * 1000),
    },
    {
      url: 'https://product.test/login',
      title: 'Login',
      visitTimes: [now],
    },
    {
      url: 'https://product.test/auth',
      title: 'Login',
      visitTimes: [now],
    },
  ]);

  const [ranked] = rankOrigins(aggregated, { now, limit: 1 });
  assert.equal(ranked.title, 'Product');
  assert.equal(ranked.visits, 10);
});
