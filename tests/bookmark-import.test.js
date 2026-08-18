import test from 'node:test';
import assert from 'node:assert/strict';

import { flattenBookmarkTree, selectBookmarkCandidates } from '../src/shared/bookmark-import.js';

const tree = [{
  id: '0',
  title: '',
  children: [{
    id: '1',
    title: '书签栏',
    children: [
      { id: 'a', title: 'GitHub', url: 'https://github.com/' },
      { id: 'b', title: '设置', url: 'chrome://settings/' },
      { id: '2', title: '工作', children: [{ id: 'c', title: 'Docs', url: 'https://docs.test/' }] },
    ],
  }],
}];

test('书签树按文件夹展开并排除不可导航地址', () => {
  const result = flattenBookmarkTree(tree);
  assert.deepEqual(result.folders.map((folder) => folder.path), ['书签栏', '书签栏 / 工作']);
  assert.equal(result.folders[0].bookmarks[0].title, 'GitHub');
  assert.equal(result.invalid.length, 1);
});

test('选择文件夹后只生成对应导入候选', () => {
  const { folders } = flattenBookmarkTree(tree);
  const selected = selectBookmarkCandidates(folders, ['2']);
  assert.deepEqual(selected.map((bookmark) => bookmark.url), ['https://docs.test/']);
});
