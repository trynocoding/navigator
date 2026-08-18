// 入口：装配搜索、时钟、主题、快捷区、推荐区与设置

import { ENGINES, DEFAULT_SETTINGS } from '../shared/constants.js';
import { loadAll, saveSettings } from '../shared/storage.js';
import { Shortcuts } from './modules/shortcuts.js';
import { Recommend } from './modules/recommend.js';
import { openSettingsDialog } from './modules/settings.js';

const $ = (sel) => document.querySelector(sel);

const state = {
  settings: { ...DEFAULT_SETTINGS },
  blocked: [],
};

const shortcuts = new Shortcuts($('#shortcuts-grid'), $('#shortcuts-empty'));
const recommend = new Recommend(
  $('#recommend-grid'),
  $('#recommend-hint'),
  $('#btn-recommend-toggle'),
);

// ---- 启动 ----

init().catch((err) => console.error('[navigator] 初始化失败:', err));

async function init() {
  const { settings, shortcuts: sc, blocked } = await loadAll();
  state.settings = settings;
  state.blocked = blocked;

  shortcuts.setState(sc, settings.faviconSource);
  shortcuts.persist = wrapPersist(shortcuts);
  recommend.onPin = (site) => shortcuts.pin(site);
  recommend.onEnable = async () => {
    const result = await applyUserSettings({ ...state.settings, recommendEnabled: true });
    if (!result.ok) recommend.showHint(result.message);
  };
  recommend.onDisable = () => applySettings({ ...state.settings, recommendEnabled: false }, true);
  recommend.setPinnedOrigins(shortcuts.pinnedOrigins);
  recommend.setState({
    blocked,
    faviconSource: settings.faviconSource,
    enabled: settings.recommendEnabled,
  });

  applySettings(settings, false);
  initSearch();
  initClock();

  $('#btn-settings').addEventListener('click', () =>
    openSettingsDialog(state.settings, {
      onApply: (next) => applyUserSettings(next),
    }),
  );
  $('#btn-add-shortcut').addEventListener('click', () => shortcuts.add());
}

// ---- 设置应用（主题 / 引擎 / 各区域刷新） ----

async function applySettings(next, persist) {
  const prev = state.settings;
  state.settings = next;
  applyTheme(next);
  renderEngineSelect();

  const faviconChanged = prev.faviconSource !== next.faviconSource;
  shortcuts.setState(currentShortcuts(), next.faviconSource);
  recommend.blocked = state.blocked;
  recommend.setPinnedOrigins(shortcuts.pinnedOrigins);

  if (prev.recommendEnabled !== next.recommendEnabled || faviconChanged || persist) {
    recommend.setState({
      blocked: state.blocked,
      faviconSource: next.faviconSource,
      enabled: next.recommendEnabled,
    });
  }

  if (persist) await saveSettings(next);
}

async function applyUserSettings(next) {
  if (next.recommendEnabled && !state.settings.recommendEnabled) {
    const granted = await chrome.permissions.request({ permissions: ['history'] });
    if (!granted) {
      return {
        ok: false,
        message: '需要浏览记录权限才能开启自动推荐。你可以稍后再次尝试。',
      };
    }
  }

  await applySettings(next, true);
  return { ok: true };
}

// shortcuts 内部数组是数据源；这里包一层读取
function currentShortcuts() {
  return shortcuts.shortcuts;
}

function wrapPersist(instance) {
  const original = instance.persist.bind(instance);
  return async (...args) => {
    await original(...args);
    recommend.setPinnedOrigins(instance.pinnedOrigins);
    if (state.settings.recommendEnabled) await recommend.refresh();
  };
}

// ---- 主题 ----

function applyTheme(settings) {
  const resolved =
    settings.theme === 'auto'
      ? matchMedia('(prefers-color-scheme: dark)').matches
        ? 'graphite'
        : 'cloud'
      : settings.theme;
  document.documentElement.dataset.theme = resolved;
  if (settings.accent) {
    document.documentElement.style.setProperty('--accent', settings.accent);
  } else {
    document.documentElement.style.removeProperty('--accent');
  }
}

matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (state.settings.theme === 'auto') applyTheme(state.settings);
});

// ---- 搜索 ----

function renderEngineSelect() {
  const sel = $('#engine-select');
  const current = state.settings.engine;
  sel.textContent = '';
  for (const [id, e] of Object.entries(ENGINES)) {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = e.label;
    sel.append(opt);
  }
  sel.value = current in ENGINES ? current : 'google';
  sel.onchange = async () => {
    state.settings.engine = sel.value;
    await saveSettings(state.settings);
  };
}

function initSearch() {
  const input = $('#search-input');
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const q = input.value.trim();
    if (!q) return;
    window.location.href = buildTarget(q);
  });
}

function buildTarget(q) {
  const looksLikeUrl =
    /^(https?:\/\/)/i.test(q) || (/^[\w-]+(\.[\w-]+)+/.test(q) && !q.includes(' '));
  if (looksLikeUrl) {
    const url = /^https?:\/\//i.test(q) ? q : `https://${q}`;
    try {
      return new URL(url).href;
    } catch {
      /* 走搜索 */
    }
  }
  const engine = ENGINES[state.settings.engine] || ENGINES.google;
  const template =
    state.settings.engine === 'custom' ? state.settings.customEngine : engine.url;
  return template.includes('%s')
    ? template.replace('%s', encodeURIComponent(q))
    : `${template}${encodeURIComponent(q)}`;
}

// ---- 时钟 ----

function initClock() {
  const timeEl = $('#clock-time');
  const dateEl = $('#clock-date');
  const greetingEl = $('#greeting');
  const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
  const update = () => {
    const d = new Date();
    const hour = d.getHours();
    timeEl.textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    dateEl.textContent = `${d.getMonth() + 1}月${d.getDate()}日 · 星期${WEEK[d.getDay()]}`;
    greetingEl.textContent = hour < 6 ? '夜深了，慢一点也没关系' : hour < 11 ? '早上好，开启清晰的一天' : hour < 14 ? '中午好，继续保持节奏' : hour < 18 ? '下午好，专注下一件事' : '晚上好，收好今天的灵感';
  };
  update();
  setInterval(update, 1000);
}
