// chrome.storage.sync 封装：跨设备同步，本地零服务器
// 快捷方式使用版本化分片，避免 sync 单项 8KB 限制。

import { DEFAULT_SETTINGS } from './constants.js';

const KEYS = {
  settings: 'nv_settings',
  shortcutsLegacy: 'nv_shortcuts',
  shortcutsMeta: 'nv_shortcuts_meta',
  blocked: 'nv_blocked',
  customIcons: 'nv_custom_icons',
};

const SHORTCUT_SCHEMA_VERSION = 2;
const SHORTCUT_CHUNK_PREFIX = 'nv_shortcuts_v2_';
export const SHORTCUT_CHUNK_MAX_BYTES = 7000;

export async function loadAll() {
  const [data, localData] = await Promise.all([
    chrome.storage.sync.get([
      KEYS.settings,
      KEYS.shortcutsLegacy,
      KEYS.shortcutsMeta,
      KEYS.blocked,
    ]),
    chrome.storage.local.get(KEYS.customIcons),
  ]);

  const loaded = await loadShortcutRecords(data);
  const shortcuts = normalizeShortcuts(
    loaded.records,
    localData[KEYS.customIcons] || {},
  );

  // V1 的单键数据在读取成功后自动迁移。迁移失败不影响本次使用，
  // 原键也会保留，下一次启动仍可重试。
  if (loaded.source === 'legacy') {
    try {
      await saveShortcuts(shortcuts);
    } catch (error) {
      console.warn('[navigator] 快捷方式存储迁移失败，将继续使用旧数据。', error);
    }
  }

  return {
    settings: { ...DEFAULT_SETTINGS, ...(data[KEYS.settings] || {}) },
    shortcuts,
    blocked: data[KEYS.blocked] || [],
  };
}

export function saveSettings(settings) {
  return chrome.storage.sync.set({ [KEYS.settings]: settings });
}

export async function saveShortcuts(shortcuts) {
  const syncedShortcuts = shortcuts.map(({ id, title, url }) => ({ id, title, url }));
  const customIcons = Object.fromEntries(
    shortcuts
      .filter((shortcut) => isCustomIcon(shortcut.customIcon))
      .map((shortcut) => [shortcut.id, shortcut.customIcon]),
  );

  await saveShortcutRecords(syncedShortcuts);
  // 图片很容易超过 sync 单项限制，因此只在本机存储图标数据。
  await chrome.storage.local.set({ [KEYS.customIcons]: customIcons });
}

export function saveBlocked(blocked) {
  return chrome.storage.sync.set({ [KEYS.blocked]: blocked });
}

// 导出/导入用
export async function exportAll() {
  const { settings, shortcuts, blocked } = await loadAll();
  return { app: 'navigator', version: 2, exportedAt: new Date().toISOString(), settings, shortcuts, blocked };
}

export async function importAll(payload) {
  if (payload?.app !== 'navigator' || !Array.isArray(payload.shortcuts)) {
    throw new Error('不是有效的 Navigator 导出文件');
  }
  const settings = { ...DEFAULT_SETTINGS, ...payload.settings };
  const shortcuts = normalizeShortcuts(payload.shortcuts);
  const blocked = Array.isArray(payload.blocked) ? payload.blocked : [];
  await Promise.all([
    saveSettings(settings),
    saveShortcuts(shortcuts),
    saveBlocked(blocked),
  ]);
  return { settings, shortcuts, blocked };
}

// ---- 内部 ----

async function loadShortcutRecords(initialData) {
  const meta = initialData[KEYS.shortcutsMeta];
  if (isShortcutMeta(meta)) {
    try {
      return { records: await readShortcutGeneration(meta), source: 'v2' };
    } catch (initialError) {
      // 读取期间可能恰好有另一个页面完成了新一代提交并清理旧分片。
      // 重新读取一次元数据即可切到最新一代，避免把正常并发误判为损坏。
      const latestData = await chrome.storage.sync.get(KEYS.shortcutsMeta);
      const latestMeta = latestData[KEYS.shortcutsMeta];
      if (isShortcutMeta(latestMeta) && latestMeta.generation !== meta.generation) {
        try {
          return { records: await readShortcutGeneration(latestMeta), source: 'v2' };
        } catch {
          // 继续走旧版回退或错误提示。
        }
      }
      const legacy = initialData[KEYS.shortcutsLegacy];
      if (Array.isArray(legacy)) {
        console.warn('[navigator] 新版快捷方式数据不完整，已回退旧版数据。', initialError);
        return { records: legacy, source: 'legacy' };
      }
      throw new Error(`快捷方式同步数据损坏：${initialError.message}`);
    }
  }

  const legacy = initialData[KEYS.shortcutsLegacy];
  if (Array.isArray(legacy)) return { records: legacy, source: 'legacy' };
  return { records: [], source: 'empty' };
}

async function readShortcutGeneration(meta) {
  const chunkKeys = shortcutChunkKeys(meta.generation, meta.chunkCount);
  const chunkData = chunkKeys.length
    ? await chrome.storage.sync.get(chunkKeys)
    : {};
  const records = [];
  for (const key of chunkKeys) {
    const chunk = chunkData[key];
    if (!Array.isArray(chunk)) throw new Error(`缺少分片 ${key}`);
    records.push(...chunk);
  }
  if (records.length !== meta.count || shortcutChecksum(records) !== meta.checksum) {
    throw new Error('分片数量或校验值不匹配');
  }
  return records;
}

async function saveShortcutRecords(records) {
  const chunks = chunkShortcutRecords(records);
  const generation = createGeneration();
  const chunkKeys = shortcutChunkKeys(generation, chunks.length);
  const chunkPayload = Object.fromEntries(
    chunkKeys.map((key, index) => [key, chunks[index]]),
  );
  const previous = await chrome.storage.sync.get([
    KEYS.shortcutsMeta,
    KEYS.shortcutsLegacy,
  ]);
  const previousMeta = previous[KEYS.shortcutsMeta];
  const hasLegacyFallback = Array.isArray(previous[KEYS.shortcutsLegacy]);

  // 先写完整的新一代分片，最后切换元数据指针。若任一步失败，
  // 旧元数据仍指向可用数据，不会出现“写了一半”的列表。
  if (chunkKeys.length) await chrome.storage.sync.set(chunkPayload);
  try {
    await chrome.storage.sync.set({
      [KEYS.shortcutsMeta]: {
        version: SHORTCUT_SCHEMA_VERSION,
        generation,
        chunkCount: chunks.length,
        count: records.length,
        checksum: shortcutChecksum(records),
        updatedAt: Date.now(),
      },
    });
  } catch (error) {
    // 指针未切换时，新分片尚未被任何读取方引用，可以安全回收。
    if (chunkKeys.length) {
      try {
        await chrome.storage.sync.remove(chunkKeys);
      } catch {
        // 即使回收失败，旧元数据仍保持有效。
      }
    }
    throw error;
  }

  try {
    // 只清理本次提交前明确指向的旧一代，避免并发保存时误删另一个
    // 正在写入的新一代分片。元数据写入失败留下的孤儿分片不影响读取。
    const staleKeys = isShortcutMeta(previousMeta)
      ? shortcutChunkKeys(previousMeta.generation, previousMeta.chunkCount)
      : [];
    // 首次从 V1 迁移时保留旧键作为一次回退；下一次成功保存后再清理。
    if (isShortcutMeta(previousMeta) && hasLegacyFallback) {
      staleKeys.push(KEYS.shortcutsLegacy);
    }
    if (staleKeys.length) await chrome.storage.sync.remove([...new Set(staleKeys)]);
  } catch (error) {
    // 清理失败只会留下无引用数据，不影响刚刚提交的新一代分片。
    console.warn('[navigator] 快捷方式旧分片清理失败。', error);
  }
}

export function chunkShortcutRecords(records, maxBytes = SHORTCUT_CHUNK_MAX_BYTES) {
  const chunks = [];
  let current = [];

  for (const record of records) {
    const next = [...current, record];
    if (utf8Bytes(JSON.stringify(next)) <= maxBytes) {
      current = next;
      continue;
    }
    if (!current.length) {
      throw new Error('单个快捷方式的数据过大，无法同步。');
    }
    chunks.push(current);
    current = [record];
    if (utf8Bytes(JSON.stringify(current)) > maxBytes) {
      throw new Error('单个快捷方式的数据过大，无法同步。');
    }
  }

  if (current.length) chunks.push(current);
  return chunks;
}

function isShortcutMeta(value) {
  return value?.version === SHORTCUT_SCHEMA_VERSION
    && typeof value.generation === 'string'
    && Number.isInteger(value.chunkCount)
    && value.chunkCount >= 0
    && Number.isInteger(value.count)
    && value.count >= 0
    && typeof value.checksum === 'string';
}

function shortcutChunkKeys(generation, count) {
  return Array.from(
    { length: count },
    (_, index) => `${SHORTCUT_CHUNK_PREFIX}${generation}_${index}`,
  );
}

function createGeneration() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function shortcutChecksum(records) {
  const bytes = new TextEncoder().encode(JSON.stringify(records));
  let hash = 2166136261;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function utf8Bytes(value) {
  return new TextEncoder().encode(value).byteLength;
}

function normalizeShortcuts(list, storedIcons = {}) {
  return list
    .filter((s) => s && typeof s.url === 'string')
    .map((s, i) => {
      const id = typeof s.id === 'string' ? s.id : `s${Date.now()}_${i}`;
      const customIcon = isCustomIcon(s.customIcon)
        ? s.customIcon
        : isCustomIcon(storedIcons[id])
          ? storedIcons[id]
          : '';
      return {
        id,
        title: String(s.title || '').trim() || hostOf(s.url) || s.url,
        url: s.url,
        ...(customIcon ? { customIcon } : {}),
      };
    });
}

function isCustomIcon(value) {
  return typeof value === 'string' && /^data:image\/(?:png|jpeg|webp);base64,/i.test(value);
}

export function hostOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}
