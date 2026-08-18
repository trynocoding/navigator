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
