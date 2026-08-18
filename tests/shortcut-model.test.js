import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_GROUP_ID,
  ShortcutCollection,
  canonicalUrl,
  dedupeShortcuts,
} from '../src/shared/shortcut-model.js';

const sample = [
  { id: 'a', title: 'GitHub', url: 'https://github.com/', groupId: 'work' },
  { id: 'b', title: '设计素材', url: 'https://example.com/design/', groupId: 'design' },
];
const groups = [
  { id: 'work', title: '工作' },
  { id: 'design', title: '设计' },
];

test('旧快捷方式会自动归入常用分组', () => {
  const collection = new ShortcutCollection([{ id: 'a', title: 'A', url: 'https://a.test/' }]);
  assert.equal(collection.shortcuts[0].groupId, DEFAULT_GROUP_ID);
  assert.equal(collection.groups[0].title, '常用');
});

test('URL 规范化后识别重复并允许编辑原条目', () => {
  const collection = new ShortcutCollection(sample, groups);
  assert.equal(canonicalUrl('https://github.com/#readme'), 'https://github.com/');
  assert.equal(collection.add({ title: '重复', url: 'https://GITHUB.com/#x' }).reason, 'duplicate');
  assert.equal(collection.update('a', { title: 'GitHub 新名', url: 'https://github.com/#home', groupId: 'work' }).ok, true);
});

test('删除可恢复到原位置', () => {
  const collection = new ShortcutCollection(sample, groups);
  const change = collection.remove('a');
  assert.deepEqual(collection.shortcuts.map((item) => item.id), ['b']);
  collection.restore(change);
  assert.deepEqual(collection.shortcuts.map((item) => item.id), ['a', 'b']);
});

test('跨组拖拽会更新分组和顺序', () => {
  const collection = new ShortcutCollection(sample, groups);
  assert.equal(collection.moveBefore('a', 'b', 'design'), true);
  assert.deepEqual(collection.shortcuts.map((item) => item.id), ['a', 'b']);
  assert.equal(collection.shortcuts[0].groupId, 'design');
});

test('搜索匹配名称、域名和分组名并按相关度排序', () => {
  const collection = new ShortcutCollection(sample, groups);
  assert.equal(collection.search('git')[0].id, 'a');
  assert.equal(collection.search('example.com')[0].id, 'b');
  assert.equal(collection.search('设计')[0].id, 'b');
});

test('删除分组会把其中快捷方式移回常用', () => {
  const collection = new ShortcutCollection(sample, groups);
  assert.equal(collection.deleteGroup('work'), true);
  assert.equal(collection.shortcuts[0].groupId, DEFAULT_GROUP_ID);
  assert.equal(collection.groups.some((group) => group.id === 'work'), false);
});

test('导入去重保留首个规范化网址', () => {
  const result = dedupeShortcuts([
    { id: 'a', title: 'GitHub', url: 'https://github.com/' },
    { id: 'b', title: '重复 GitHub', url: 'https://GITHUB.com/#readme' },
    { id: 'c', title: 'Docs', url: 'https://github.com/docs' },
  ]);
  assert.deepEqual(result.shortcuts.map((item) => item.id), ['a', 'c']);
  assert.deepEqual(result.duplicates.map((item) => item.id), ['b']);
});
