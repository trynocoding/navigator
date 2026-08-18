import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SHORTCUT_CHUNK_MAX_BYTES,
  clearAllData,
  loadAll,
  saveShortcutState,
  saveShortcuts,
} from '../src/shared/storage.js';

function makeArea(initial = {}) {
  const area = {
    data: structuredClone(initial),
    failMetaWrite: false,
    async get(keys) {
      if (keys === null) return structuredClone(this.data);
      const list = Array.isArray(keys) ? keys : [keys];
      return Object.fromEntries(
        list
          .filter((key) => Object.hasOwn(this.data, key))
          .map((key) => [key, structuredClone(this.data[key])]),
      );
    },
    async set(entries) {
      if (this.failMetaWrite && Object.hasOwn(entries, 'nv_shortcuts_meta')) {
        throw new Error('simulated metadata failure');
      }
      for (const [key, value] of Object.entries(entries)) {
        this.data[key] = structuredClone(value);
      }
    },
    async remove(keys) {
      for (const key of Array.isArray(keys) ? keys : [keys]) delete this.data[key];
    },
  };
  return area;
}

function installChrome(syncInitial = {}, localInitial = {}) {
  const sync = makeArea(syncInitial);
  const local = makeArea(localInitial);
  globalThis.chrome = { storage: { sync, local } };
  return { sync, local };
}

function makeShortcuts(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `s${index}`,
    title: `站点 ${index} ${'标题'.repeat(12)}`,
    url: `https://example-${index}.test/path?query=${'x'.repeat(32)}`,
  }));
}

test('大量快捷方式会被拆分为安全大小的多个同步项', async () => {
  const { sync } = installChrome();
  const shortcuts = makeShortcuts(240);

  await saveShortcuts(shortcuts);

  const meta = sync.data.nv_shortcuts_meta;
  assert.equal(meta.version, 2);
  assert.ok(meta.chunkCount > 1);
  const chunkKeys = Object.keys(sync.data).filter((key) => key.startsWith('nv_shortcuts_v2_'));
  assert.equal(chunkKeys.length, meta.chunkCount);
  for (const key of chunkKeys) {
    assert.ok(
      new TextEncoder().encode(JSON.stringify(sync.data[key])).byteLength
        <= SHORTCUT_CHUNK_MAX_BYTES,
    );
  }

  const loaded = await loadAll();
  assert.equal(loaded.shortcuts.length, shortcuts.length);
  assert.deepEqual(loaded.shortcuts.at(-1), { ...shortcuts.at(-1), groupId: 'default' });
});

test('V1 单键数据自动迁移，首次保留回退数据，后续保存再清理', async () => {
  const customIcon = `data:image/png;base64,${'a'.repeat(20)}`;
  const legacy = [{ id: 'legacy', title: '旧站点', url: 'https://legacy.test/' }];
  const { sync } = installChrome(
    { nv_shortcuts: legacy },
    { nv_custom_icons: { legacy: customIcon } },
  );

  const migrated = await loadAll();
  assert.equal(migrated.shortcuts[0].customIcon, customIcon);
  assert.equal(sync.data.nv_shortcuts_meta.version, 2);
  assert.deepEqual(sync.data.nv_shortcuts, legacy);

  await saveShortcuts([
    ...migrated.shortcuts,
    { id: 'new', title: '新站点', url: 'https://new.test/' },
  ]);
  assert.equal(Object.hasOwn(sync.data, 'nv_shortcuts'), false);
  assert.equal((await loadAll()).shortcuts.length, 2);
});

test('元数据切换失败时仍读取上一代完整数据', async () => {
  const { sync } = installChrome();
  const original = [{ id: 'old', title: '原数据', url: 'https://old.test/' }];
  await saveShortcuts(original);
  const committedMeta = structuredClone(sync.data.nv_shortcuts_meta);
  const committedChunkKeys = Object.keys(sync.data)
    .filter((key) => key.startsWith('nv_shortcuts_v2_'))
    .sort();

  sync.failMetaWrite = true;
  await assert.rejects(
    saveShortcuts([{ id: 'new', title: '未提交数据', url: 'https://new.test/' }]),
    /simulated metadata failure/,
  );
  sync.failMetaWrite = false;

  assert.deepEqual(sync.data.nv_shortcuts_meta, committedMeta);
  assert.deepEqual(
    Object.keys(sync.data).filter((key) => key.startsWith('nv_shortcuts_v2_')).sort(),
    committedChunkKeys,
  );
  assert.deepEqual((await loadAll()).shortcuts, original.map((item) => ({ ...item, groupId: 'default' })));
});

test('清空快捷方式会提交空元数据并移除上一代分片', async () => {
  const { sync } = installChrome();
  await saveShortcuts(makeShortcuts(120));
  const oldChunkKeys = Object.keys(sync.data).filter((key) => key.startsWith('nv_shortcuts_v2_'));
  assert.ok(oldChunkKeys.length > 1);

  await saveShortcuts([]);

  assert.equal(sync.data.nv_shortcuts_meta.count, 0);
  assert.equal(sync.data.nv_shortcuts_meta.chunkCount, 0);
  assert.ok(oldChunkKeys.every((key) => !Object.hasOwn(sync.data, key)));
  assert.deepEqual((await loadAll()).shortcuts, []);
});

test('读取期间发生并发提交时会自动切换到最新一代', async () => {
  let areas = installChrome();
  const oldRecords = [{ id: 'old', title: '旧一代', url: 'https://old.test/' }];
  await saveShortcuts(oldRecords);
  const oldSnapshot = structuredClone(areas.sync.data);

  areas = installChrome();
  const newRecords = [{ id: 'new', title: '新一代', url: 'https://new.test/' }];
  await saveShortcuts(newRecords);
  const newSnapshot = structuredClone(areas.sync.data);

  const oldMeta = oldSnapshot.nv_shortcuts_meta;
  const newMeta = newSnapshot.nv_shortcuts_meta;
  const newChunks = Object.fromEntries(
    Object.entries(newSnapshot).filter(([key]) => key.startsWith('nv_shortcuts_v2_')),
  );
  const { sync } = installChrome({ ...oldSnapshot, ...newChunks });
  const baseGet = sync.get.bind(sync);
  let switched = false;
  sync.get = async function getWithConcurrentCommit(keys) {
    const list = Array.isArray(keys) ? keys : [keys];
    if (!switched && list.some((key) => key?.includes(oldMeta.generation))) {
      switched = true;
      for (const key of Object.keys(this.data)) {
        if (key.includes(oldMeta.generation)) delete this.data[key];
      }
      this.data.nv_shortcuts_meta = structuredClone(newMeta);
    }
    return baseGet(keys);
  };

  assert.deepEqual((await loadAll()).shortcuts, newRecords.map((item) => ({ ...item, groupId: 'default' })));
});

test('新版分片损坏时回退到迁移期保留的 V1 数据', async () => {
  const legacy = [{ id: 'legacy', title: '可回退', url: 'https://fallback.test/' }];
  const { sync } = installChrome({ nv_shortcuts: legacy });
  await loadAll();

  const meta = sync.data.nv_shortcuts_meta;
  delete sync.data[`nv_shortcuts_v2_${meta.generation}_0`];

  const originalWarn = console.warn;
  let loaded;
  try {
    console.warn = () => {};
    loaded = await loadAll();
  } finally {
    console.warn = originalWarn;
  }
  assert.deepEqual(
    loaded.shortcuts.map(({ id, title, url }) => ({ id, title, url })),
    legacy,
  );
});

test('快捷方式与分组通过同一元数据指针提交', async () => {
  const { sync } = installChrome();
  const groups = [
    { id: 'default', title: '常用', collapsed: false },
    { id: 'work', title: '工作', collapsed: true },
  ];
  await saveShortcutState({
    shortcuts: [{ id: 'a', title: '工作台', url: 'https://work.test/', groupId: 'work' }],
    groups,
  });

  assert.deepEqual(sync.data.nv_shortcuts_meta.groups, groups);
  const loaded = await loadAll();
  assert.deepEqual(loaded.groups, groups);
  assert.equal(loaded.shortcuts[0].groupId, 'work');
});

test('一键清除只删除 Navigator 命名空间数据', async () => {
  const { sync, local } = installChrome(
    { nv_settings: { theme: 'cloud' }, unrelated: 'keep' },
    { nv_custom_icons: { a: 'data:image/png;base64,abc' }, cache: 'keep' },
  );

  await clearAllData();

  assert.deepEqual(sync.data, { unrelated: 'keep' });
  assert.deepEqual(local.data, { cache: 'keep' });
});
