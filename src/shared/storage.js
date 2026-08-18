// chrome.storage.sync 封装：跨设备同步，本地零服务器
// sync 单 key 限制 8KB，快捷方式与配置分 key 存储

import { DEFAULT_SETTINGS } from './constants.js';

const KEYS = {
  settings: 'nv_settings',
  shortcuts: 'nv_shortcuts',
  blocked: 'nv_blocked',
  customIcons: 'nv_custom_icons',
};

export async function loadAll() {
  const [data, localData] = await Promise.all([
    chrome.storage.sync.get([
      KEYS.settings,
      KEYS.shortcuts,
      KEYS.blocked,
    ]),
    chrome.storage.local.get(KEYS.customIcons),
  ]);
  return {
    settings: { ...DEFAULT_SETTINGS, ...(data[KEYS.settings] || {}) },
    shortcuts: normalizeShortcuts(
      data[KEYS.shortcuts] || [],
      localData[KEYS.customIcons] || {},
    ),
    blocked: data[KEYS.blocked] || [],
  };
}

export function saveSettings(settings) {
  return chrome.storage.sync.set({ [KEYS.settings]: settings });
}

export function saveShortcuts(shortcuts) {
  const syncedShortcuts = shortcuts.map(({ id, title, url }) => ({ id, title, url }));
  const customIcons = Object.fromEntries(
    shortcuts
      .filter((shortcut) => isCustomIcon(shortcut.customIcon))
      .map((shortcut) => [shortcut.id, shortcut.customIcon]),
  );

  // 图片很容易超过 sync 单 key 8KB 的限制，因此只在本机存储图标数据。
  return Promise.all([
    chrome.storage.sync.set({ [KEYS.shortcuts]: syncedShortcuts }),
    chrome.storage.local.set({ [KEYS.customIcons]: customIcons }),
  ]);
}

export function saveBlocked(blocked) {
  return chrome.storage.sync.set({ [KEYS.blocked]: blocked });
}

// 导出/导入用
export async function exportAll() {
  const { settings, shortcuts, blocked } = await loadAll();
  return { app: 'navigator', version: 1, exportedAt: new Date().toISOString(), settings, shortcuts, blocked };
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
