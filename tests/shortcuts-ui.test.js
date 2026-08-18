import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('../src/newtab/modules/shortcuts.js', import.meta.url),
  'utf8',
);

test('分组管理按钮阻止点击冒泡，菜单不会被全局处理器立即关闭', () => {
  assert.match(
    source,
    /manage\.onclick = \(event\) => \{[\s\S]{0,160}?event\.stopPropagation\(\)/,
  );
});

test('快捷方式菜单通过单一入口进入移动分组二级菜单', () => {
  assert.match(source, /'移动到…'/);
  assert.doesNotMatch(source, /`移至 · \$\{group\.title\}`/);
});
