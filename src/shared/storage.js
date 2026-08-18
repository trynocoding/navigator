// chrome.storage.sync 封装：跨设备同步，本地零服务器
// sync 单 key 限制 8KB，快捷方式与配置分 key 存储

import { DEFAULT_SETTINGS } from './constants.js';

const KEYS = {
  settings: 'nv_settings',
  shortcuts: 'nv_shortcuts',
  blocked: 'nv_blocked',
};

export async function loadAll() {
  const data = await chrome.storage.sync.get([
    KEYS.settings,
    KEYS.shortcuts,
    KEYS.blocked,
  ]);
  return {
    settings: { ...DEFAULT_SETTINGS, ...(data[KEYS.settings] || {}) },
    shortcuts: normalizeShortcuts(data[KEYS.shortcuts] || []),
    blocked: data[KEYS.blocked] || [],
  };
}

export function saveSettings(settings) {
  return chrome.storage.sync.set({ [KEYS.settings]: settings });
}

export function saveShortcuts(shortcuts) {
  return chrome.storage.sync.set({ [KEYS.shortcuts]: shortcuts });
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

function normalizeShortcuts(list) {
  return list
    .filter((s) => s && typeof s.url === 'string')
    .map((s, i) => ({
      id: typeof s.id === 'string' ? s.id : `s${Date.now()}_${i}`,
      title: String(s.title || '').trim() || hostOf(s.url) || s.url,
      url: s.url,
    }));
}

export function hostOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}
