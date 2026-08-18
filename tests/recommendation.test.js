import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { resolveRecommendProfile } from '../src/shared/recommendation.js';

test('稳定与灵敏模式使用不同的衰减和准入参数', () => {
  const stable = resolveRecommendProfile('stable');
  const sensitive = resolveRecommendProfile('sensitive');
  assert.ok(stable.halfLifeDays > sensitive.halfLifeDays);
  assert.ok(stable.minVisits > sensitive.minVisits);
});

test('首页推荐仅保留精简的时间、隐私和访问次数信息', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const source = readFileSync(new URL('../src/newtab/modules/recommend.js', import.meta.url), 'utf8');
  assert.match(html, /近 30 天 · 本机分析/);
  assert.match(source, /site\.visits} 次/);
  assert.doesNotMatch(source, /推荐依据|当前“|排序变化/);
  assert.doesNotMatch(html, /快速聚焦|拖拽即可排序|快捷方式和设置会同步/);
});
