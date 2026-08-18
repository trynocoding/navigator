import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizePageScale } from '../src/shared/constants.js';

test('页面缩放会吸附到合法步进并限制范围', () => {
  assert.equal(normalizePageScale(83), 85);
  assert.equal(normalizePageScale(111), 110);
  assert.equal(normalizePageScale(20), 80);
  assert.equal(normalizePageScale(200), 125);
  assert.equal(normalizePageScale('invalid'), 100);
});
