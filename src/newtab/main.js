// 入口：装配搜索、快捷方式集合、推荐与隐私控制。

import '../shared/chrome-shim.js';

import { ENGINES, DEFAULT_SETTINGS, normalizePageScale } from '../shared/constants.js';
import {
  clearAllData,
  getImportSnapshot,
  loadAll,
  restoreImportSnapshot,
  saveImportSnapshot,
  saveBlocked,
  saveSettings,
  saveShortcutState,
} from '../shared/storage.js';
import { flattenBookmarkTree } from '../shared/bookmark-import.js';
import { ShortcutCollection } from '../shared/shortcut-model.js';
import { Shortcuts } from './modules/shortcuts.js';
import { Recommend } from './modules/recommend.js';
import { openSettingsDialog } from './modules/settings.js';
import { openBookmarkImportDialog } from './modules/bookmark-import-dialog.js';
import { Toast } from './modules/toast.js';

const $ = (selector) => document.querySelector(selector);
const state = { settings: { ...DEFAULT_SETTINGS }, blocked: [], storageWarning: '' };
const toast = new Toast($('#toast-region'));
const shortcuts = new Shortcuts(
  $('#shortcuts-grid'),
  $('#shortcuts-empty'),
  $('#shortcut-groups'),
);
const recommend = new Recommend(
  $('#recommend-grid'),
  $('#recommend-hint'),
  $('#btn-recommend-toggle'),
  $('#recommend-description'),
);

init().catch((error) => console.error('[navigator] 初始化失败:', error));

async function init() {
  const loaded = await loadAll();
  state.settings = loaded.settings;
  state.blocked = loaded.blocked;
  shortcuts.setState(loaded.shortcuts, loaded.groups, loaded.settings.faviconSource);
  shortcuts.onChange = async () => {
    recommend.setPinnedOrigins(shortcuts.pinnedOrigins);
    if (state.settings.recommendEnabled) await recommend.refresh();
  };
  shortcuts.onUndo = (message, undo) => toast.show(message, { action: undo });
  shortcuts.onNotify = (message) => toast.show(message);

  recommend.onPin = (site) => shortcuts.pin(site);
  recommend.onEnable = async () => {
    const result = await applyUserSettings({ ...state.settings, recommendEnabled: true });
    if (!result.ok) recommend.showHint(result.message);
  };
  recommend.onDisable = () => applySettings({ ...state.settings, recommendEnabled: false }, true);
  recommend.onBlock = blockRecommendation;
  recommend.setPinnedOrigins(shortcuts.pinnedOrigins);

  applySettings(loaded.settings, false);
  initSearch();

  $('#btn-settings').addEventListener('click', openSettings);
  $('#btn-add-shortcut').addEventListener('click', () => shortcuts.add());
  $('#btn-add-group').addEventListener('click', () => shortcuts.addGroup());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshFromStorage();
  });
  showStorageWarning(loaded.storageWarning);
}

async function openSettings() {
  const [permissionGranted, bookmarksGranted, importSnapshot] = await Promise.all([
    chrome.permissions.contains({ permissions: ['history'] }),
    chrome.permissions.contains({ permissions: ['bookmarks'] }),
    getImportSnapshot(),
  ]);
  openSettingsDialog({
    settings: state.settings,
    blocked: state.blocked,
    permissionGranted,
    bookmarksGranted,
    hasImportSnapshot: Boolean(importSnapshot),
  }, {
    onApply: applyUserSettings,
    onRevokeHistory: revokeHistory,
    onRestoreBlocked: restoreBlocked,
    onImported: applyImportedState,
    onClearData: clearNavigatorData,
    onImportBookmarks: importChromeBookmarks,
    onRestoreImport: restoreBookmarkImport,
    onRevokeBookmarks: () => chrome.permissions.remove({ permissions: ['bookmarks'] }),
  });
}

async function applySettings(next, persist) {
  const previous = state.settings;
  const settings = { ...next, pageScale: normalizePageScale(next.pageScale) };
  state.settings = settings;
  applyPageScale(settings.pageScale);
  applyTheme(settings);
  renderEngineSelect();
  shortcuts.setState(shortcuts.shortcuts, shortcuts.groups, settings.faviconSource);
  recommend.setPinnedOrigins(shortcuts.pinnedOrigins);
  recommend.setState({
    blocked: state.blocked,
    faviconSource: settings.faviconSource,
    enabled: settings.recommendEnabled,
    windowDays: settings.recommendWindowDays,
    mode: settings.recommendMode,
  });
  if (persist) await saveSettings(settings);
  if (previous.faviconSource !== settings.faviconSource) shortcuts.render();
}

function applyPageScale(value) {
  $('#app').style.zoom = String(normalizePageScale(value) / 100);
}

async function importChromeBookmarks() {
  // permissions.request 必须直接由点击手势触发；已授权时会直接返回 true。
  const granted = await chrome.permissions.request({ permissions: ['bookmarks'] });
  if (!granted) return { ok: false, message: '需要书签读取权限才能导入；Navigator 不会修改 Chrome 原书签。' };

  const parsed = flattenBookmarkTree(await chrome.bookmarks.getTree());
  const selection = await openBookmarkImportDialog({
    ...parsed,
    shortcuts: shortcuts.shortcuts,
    groups: shortcuts.groups,
  });
  if (!selection) return null;

  // 导入弹窗打开期间，工具栏仍可能保存新页面；提交前以最新同步状态合并，避免覆盖。
  const latest = await loadAll();
  const collection = new ShortcutCollection(latest.shortcuts, latest.groups);
  const result = collection.addMany(selection.candidates, selection.groupId);
  if (!result.added.length) return { ok: false, message: '所选书签均已存在，没有需要导入的内容。' };
  await saveImportSnapshot({ shortcuts: latest.shortcuts, groups: latest.groups });
  await saveShortcutState(collection.snapshot());
  shortcuts.setState(collection.shortcuts, collection.groups, state.settings.faviconSource);
  recommend.setPinnedOrigins(shortcuts.pinnedOrigins);
  if (state.settings.recommendEnabled) await recommend.refresh();
  toast.show(`已导入 ${result.added.length} 个书签${result.duplicates.length ? `，跳过 ${result.duplicates.length} 个重复` : ''}`, {
    label: '整体撤销',
    action: restoreBookmarkImport,
    duration: 9000,
  });
  return { ok: true, result };
}

async function restoreBookmarkImport() {
  const snapshot = await restoreImportSnapshot();
  if (!snapshot) return false;
  shortcuts.setState(snapshot.shortcuts, snapshot.groups, state.settings.faviconSource);
  recommend.setPinnedOrigins(shortcuts.pinnedOrigins);
  if (state.settings.recommendEnabled) await recommend.refresh();
  toast.show('已恢复到书签导入前的状态');
  return true;
}

async function refreshFromStorage() {
  const loaded = await loadAll();
  state.blocked = loaded.blocked;
  shortcuts.setState(loaded.shortcuts, loaded.groups, loaded.settings.faviconSource);
  await applySettings(loaded.settings, false);
  showStorageWarning(loaded.storageWarning);
}

function showStorageWarning(message) {
  if (!message) {
    state.storageWarning = '';
    return;
  }
  if (message === state.storageWarning) return;
  state.storageWarning = message;
  toast.show(message, { duration: 12000 });
}

async function applyUserSettings(next) {
  if (next.recommendEnabled) {
    const granted = await chrome.permissions.request({ permissions: ['history'] });
    if (!granted) {
      return { ok: false, message: '需要浏览记录权限才能开启推荐。你可以稍后再次尝试。' };
    }
  }
  await applySettings(next, true);
  return { ok: true };
}

async function revokeHistory() {
  await chrome.permissions.remove({ permissions: ['history'] });
  await applySettings({ ...state.settings, recommendEnabled: false }, true);
  toast.show('已停止推荐并撤销浏览记录权限');
}

async function blockRecommendation(site) {
  if (state.blocked.includes(site.origin)) return;
  state.blocked = [...state.blocked, site.origin];
  await saveBlocked(state.blocked);
  recommend.blocked = state.blocked;
  await recommend.refresh();
  toast.show(`不再推荐 ${site.host}`, {
    action: async () => {
      state.blocked = state.blocked.filter((origin) => origin !== site.origin);
      await saveBlocked(state.blocked);
      recommend.blocked = state.blocked;
      await recommend.refresh();
    },
  });
}

async function restoreBlocked(origin) {
  state.blocked = origin
    ? state.blocked.filter((entry) => entry !== origin)
    : [];
  await saveBlocked(state.blocked);
  recommend.blocked = state.blocked;
  if (state.settings.recommendEnabled) await recommend.refresh();
}

async function applyImportedState(imported) {
  state.blocked = imported.blocked;
  shortcuts.setState(imported.shortcuts, imported.groups, imported.settings.faviconSource);
  await applySettings(imported.settings, false);
  toast.show(imported.skippedDuplicates
    ? `备份已导入，跳过 ${imported.skippedDuplicates} 个重复网址`
    : '备份已导入');
}

async function clearNavigatorData() {
  await clearAllData();
  await chrome.permissions.remove({ permissions: ['history'] });
  state.blocked = [];
  shortcuts.setState([], [], DEFAULT_SETTINGS.faviconSource);
  await applySettings({ ...DEFAULT_SETTINGS }, false);
  toast.show('Navigator 数据已清空');
}

function applyTheme(settings) {
  const resolved = settings.theme === 'auto'
    ? matchMedia('(prefers-color-scheme: dark)').matches ? 'graphite' : 'cloud'
    : settings.theme;
  document.documentElement.dataset.theme = resolved;
  if (settings.accent) document.documentElement.style.setProperty('--accent', settings.accent);
  else document.documentElement.style.removeProperty('--accent');
}

matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (state.settings.theme === 'auto') applyTheme(state.settings);
});

function renderEngineSelect() {
  const select = $('#engine-select');
  const current = state.settings.engine;
  select.textContent = '';
  for (const [id, engine] of Object.entries(ENGINES)) {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = engine.label;
    select.append(option);
  }
  select.value = current in ENGINES ? current : 'google';
  select.onchange = async () => {
    state.settings.engine = select.value;
    await saveSettings(state.settings);
  };
}

function initSearch() {
  const input = $('#search-input');
  const resultsElement = $('#search-results');
  let matches = [];
  let activeIndex = -1;

  const closeResults = () => {
    matches = [];
    activeIndex = -1;
    resultsElement.hidden = true;
    resultsElement.textContent = '';
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  };

  const renderResults = () => {
    const query = input.value.trim();
    matches = shortcuts.search(query, 6);
    resultsElement.textContent = '';
    if (!matches.length) {
      closeResults();
      return;
    }
    activeIndex = Math.min(Math.max(activeIndex, 0), matches.length - 1);
    matches.forEach((shortcut, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.id = `search-result-${index}`;
      button.className = 'search-result';
      button.classList.toggle('active', index === activeIndex);
      button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', String(index === activeIndex));
      const host = safeHost(shortcut.url);
      button.innerHTML = `<span class="result-mark">${escapeHtml(shortcut.title.slice(0, 1).toUpperCase())}</span><span class="result-copy"><strong>${escapeHtml(shortcut.title)}</strong><small>${escapeHtml(host)} · ${escapeHtml(shortcut.groupTitle)}</small></span><kbd>↵</kbd>`;
      button.addEventListener('mouseenter', () => {
        activeIndex = index;
        updateActive();
      });
      button.addEventListener('mousedown', (event) => event.preventDefault());
      button.addEventListener('click', (event) => openShortcut(shortcut, event));
      resultsElement.append(button);
    });
    resultsElement.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    updateActive();
  };

  const updateActive = () => {
    resultsElement.querySelectorAll('.search-result').forEach((element, index) => {
      element.classList.toggle('active', index === activeIndex);
      element.setAttribute('aria-selected', String(index === activeIndex));
    });
    if (activeIndex >= 0) input.setAttribute('aria-activedescendant', `search-result-${activeIndex}`);
  };

  const openShortcut = (shortcut, event) => {
    closeResults();
    openTarget(shortcut.url, event.ctrlKey || event.metaKey || event.shiftKey);
  };

  input.addEventListener('input', renderResults);
  input.addEventListener('focus', () => { if (input.value.trim()) renderResults(); });
  input.addEventListener('blur', () => setTimeout(closeResults, 120));
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' && matches.length) {
      event.preventDefault();
      activeIndex = (activeIndex + 1) % matches.length;
      updateActive();
      return;
    }
    if (event.key === 'ArrowUp' && matches.length) {
      event.preventDefault();
      activeIndex = (activeIndex - 1 + matches.length) % matches.length;
      updateActive();
      return;
    }
    if (event.key === 'Escape') {
      closeResults();
      input.select();
      return;
    }
    if (event.key !== 'Enter') return;
    const query = input.value.trim();
    if (!query) return;
    event.preventDefault();
    if (matches[activeIndex]) openShortcut(matches[activeIndex], event);
    else openTarget(buildTarget(query), event.ctrlKey || event.metaKey || event.shiftKey);
  });

  document.addEventListener('keydown', (event) => {
    const target = event.target;
    const isEditable = target instanceof HTMLInputElement
      || target instanceof HTMLTextAreaElement
      || target instanceof HTMLSelectElement
      || target?.isContentEditable;
    if ((event.key === '/' && !isEditable) || ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === 'k')) {
      event.preventDefault();
      input.focus();
      input.select();
    }
  });
}

function openTarget(url, newTab) {
  if (newTab) window.open(url, '_blank', 'noopener');
  else window.location.href = url;
}

function buildTarget(query) {
  const looksLikeUrl = /^(https?:\/\/)/i.test(query)
    || (/^[\w-]+(\.[\w-]+)+/.test(query) && !query.includes(' '));
  if (looksLikeUrl) {
    try { return new URL(/^https?:\/\//i.test(query) ? query : `https://${query}`).href; } catch { /* 搜索 */ }
  }
  const engine = ENGINES[state.settings.engine] || ENGINES.google;
  const template = state.settings.engine === 'custom' ? state.settings.customEngine : engine.url;
  return template.includes('%s')
    ? template.replace('%s', encodeURIComponent(query))
    : `${template}${encodeURIComponent(query)}`;
}

function safeHost(url) {
  try { return new URL(url).hostname; } catch { return url; }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
