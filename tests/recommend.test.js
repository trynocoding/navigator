import test from 'node:test';
import assert from 'node:assert/strict';

import { fetchRankedSites } from '../src/newtab/modules/recommend.js';

test('完整推荐流程不会因大量近期低频 URL 漏掉高频网站', async () => {
  const now = Date.now();
  const frequentUrl = 'https://frequent.test/';
  const items = [
    ...Array.from({ length: 90 }, (_, index) => ({
      url: `https://recent-${index}.test/`,
      title: `Recent ${index}`,
      visitCount: 1,
      lastVisitTime: now - index * 1000,
    })),
    {
      url: frequentUrl,
      title: 'Frequent',
      visitCount: 100,
      lastVisitTime: now - 20 * 86400000,
    },
  ];

  globalThis.chrome = {
    history: {
      async search() { return items; },
      async getVisits({ url }) {
        if (url === frequentUrl) {
          return Array.from(
            { length: 12 },
            (_, index) => ({ visitTime: now - (index + 1) * 86400000 }),
          );
        }
        return [{ visitTime: now }];
      },
    },
  };

  const ranked = await fetchRankedSites({
    limit: 3,
    windowDays: 30,
    blocked: [],
    pinnedOrigins: [],
  });

  assert.equal(ranked[0].origin, 'https://frequent.test');
  assert.equal(ranked[0].visits, 12);
});

test('灵敏模式可纳入近期低频站点，稳定模式会过滤', async () => {
  const now = Date.now();
  globalThis.chrome = {
    history: {
      async search() {
        return [{ url: 'https://new-habit.test/', title: 'New Habit', visitCount: 2, lastVisitTime: now }];
      },
      async getVisits() {
        return [{ visitTime: now }, { visitTime: now - 1000 }];
      },
    },
  };

  const base = { limit: 3, windowDays: 7, blocked: [], pinnedOrigins: [] };
  assert.equal((await fetchRankedSites({ ...base, mode: 'stable' })).length, 0);
  assert.equal((await fetchRankedSites({ ...base, mode: 'sensitive' })).length, 1);
});
