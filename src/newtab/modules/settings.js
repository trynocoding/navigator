// 设置与隐私控制中心：外观、搜索、推荐权限、屏蔽列表和数据生命周期。

import {
  DEFAULT_SETTINGS,
  ENGINES,
  FAVICON_SOURCES,
  RECOMMEND_MODES,
  RECOMMEND_WINDOWS,
  THEMES,
} from '../../shared/constants.js';
import { exportAll, importAll } from '../../shared/storage.js';

export function openSettingsDialog(context, handlers) {
  const {
    settings,
    blocked = [],
    permissionGranted = false,
    bookmarksGranted = false,
    hasImportSnapshot = false,
  } = context;
  const externalFavicon = settings.faviconSource !== 'chrome';
  const dlg = document.createElement('dialog');
  dlg.className = 'settings-dialog';
  dlg.setAttribute('aria-labelledby', 'settings-dialog-title');
  dlg.innerHTML = `
    <div class="settings-shell">
      <header class="settings-head">
        <div><h3 id="settings-dialog-title">设置与隐私</h3><p>管理外观、导航方式和数据权限</p></div>
        <button type="button" class="quiet-icon" data-action="close" aria-label="关闭设置">×</button>
      </header>
      <div class="settings-body">
        <section class="settings-section" aria-labelledby="appearance-title">
          <h4 id="appearance-title">外观</h4>
          <div class="theme-grid" aria-label="主题">
            ${THEMES.map((theme) => `<label class="theme-option"><input type="radio" name="theme" value="${theme.id}" /><span class="theme-card"><span class="theme-swatch" data-theme-preview="${theme.id}"></span><span>${theme.label}</span></span></label>`).join('')}
          </div>
          <div class="form-row settings-inline-row">
            <label for="settings-accent">强调色</label>
            <div class="accent-row"><input id="settings-accent" name="accent" type="color" /><button type="button" class="btn-ghost" data-action="reset-accent">使用主题默认色</button></div>
          </div>
        </section>

        <section class="settings-section" aria-labelledby="search-title">
          <h4 id="search-title">搜索与网站图标</h4>
          <div class="form-row"><label for="settings-engine">默认搜索引擎</label><select id="settings-engine" name="engine">${Object.entries(ENGINES).map(([id, engine]) => `<option value="${id}">${engine.label}</option>`).join('')}</select></div>
          <div class="form-row" data-row="custom-engine" hidden><label for="settings-custom-engine">自定义搜索地址</label><input id="settings-custom-engine" name="customEngine" type="text" placeholder="https://example.com/search?q=%s" /><p class="form-hint">使用 %s 作为搜索关键词占位符</p></div>
          <div class="form-row"><label for="settings-favicon">网站图标来源</label><select id="settings-favicon" name="faviconSource">${FAVICON_SOURCES.map((source) => `<option value="${source.id}">${source.label}</option>`).join('')}</select><p class="form-hint">外部图标服务会收到需要查询的网站域名。</p></div>
        </section>

        <section class="settings-section" aria-labelledby="privacy-title">
          <div class="settings-title-row"><h4 id="privacy-title">推荐与隐私</h4><span class="status-pill ${permissionGranted ? 'is-on' : ''}">${permissionGranted ? '已授权' : '未授权'}</span></div>
          <label class="switch-row" for="settings-recommend"><input id="settings-recommend" name="recommendEnabled" type="checkbox" /><span class="switch-track" aria-hidden="true"></span><span class="switch-copy"><strong>自动发现常去网站</strong><span>只分析所选时间范围内的浏览记录；关闭后停止读取</span></span></label>
          <div class="permission-card">
            <div><strong>浏览记录权限</strong><p>${permissionGranted ? 'Chrome 已允许 Navigator 在本机计算访问频次。' : '当前无法读取浏览记录；开启推荐时才会申请。'}</p></div>
            ${permissionGranted ? '<button type="button" class="btn-ghost" data-action="revoke-history">撤销权限</button>' : ''}
          </div>
          <div class="recommend-controls">
            <div class="form-row"><label for="settings-recommend-window">分析范围</label><select id="settings-recommend-window" name="recommendWindowDays">${RECOMMEND_WINDOWS.map((window) => `<option value="${window.value}">${window.label}</option>`).join('')}</select></div>
            <fieldset><legend>排序偏好</legend><div class="recommend-mode-grid">${RECOMMEND_MODES.map((mode) => `<label><input type="radio" name="recommendMode" value="${mode.id}" /><span><strong>${mode.label}</strong><small>${mode.description}</small></span></label>`).join('')}</div></fieldset>
          </div>
          <div class="blocked-panel">
            <div class="blocked-head"><div><strong>不再推荐</strong><span>${blocked.length ? `${blocked.length} 个网站` : '暂无屏蔽网站'}</span></div>${blocked.length ? '<button type="button" class="text-button" data-action="restore-all">全部恢复</button>' : ''}</div>
            <div class="blocked-list">${blocked.map((origin) => `<div class="blocked-item"><span title="${escapeHtml(origin)}">${escapeHtml(displayOrigin(origin))}</span><button type="button" data-restore="${escapeHtml(origin)}">恢复</button></div>`).join('')}</div>
          </div>
        </section>

        <section class="settings-section" aria-labelledby="bookmarks-title">
          <div class="settings-title-row"><h4 id="bookmarks-title">Chrome 书签</h4><span class="status-pill ${bookmarksGranted ? 'is-on' : ''}">${bookmarksGranted ? '已授权' : '按需授权'}</span></div>
          <p class="section-description settings-section-copy">选择文件夹导入，Navigator 会先预览并跳过重复网址，不会修改 Chrome 原书签。</p>
          <div class="bookmark-actions">
            <button type="button" class="btn-primary" data-action="import-bookmarks">从 Chrome 导入</button>
            ${hasImportSnapshot ? '<button type="button" class="btn-ghost" data-action="restore-import">撤销上次书签导入</button>' : ''}
            ${bookmarksGranted ? '<button type="button" class="text-button" data-action="revoke-bookmarks">撤销书签权限</button>' : ''}
          </div>
        </section>

        <section class="settings-section" aria-labelledby="flow-title">
          <h4 id="flow-title">数据去向</h4>
          <div class="data-flow">
            <article><span class="flow-icon local">本机</span><div><strong>浏览分析与自定义图标</strong><p>访问频次在设备内计算；自定义图标只保存在当前设备。</p></div></article>
            <article><span class="flow-icon sync">同步</span><div><strong>Chrome 同步存储</strong><p>快捷方式、分组、设置和屏蔽列表随 Chrome 账号同步。</p></div></article>
            <article class="${externalFavicon ? 'has-external' : ''}"><span class="flow-icon external">外部</span><div><strong>网站图标请求</strong><p>${externalFavicon ? `当前使用 ${faviconLabel(settings.faviconSource)}，查询时会发送网站域名。` : '当前使用浏览器缓存，不向第三方图标服务发送域名。'}</p></div></article>
          </div>
        </section>

        <section class="settings-section" aria-labelledby="data-title">
          <h4 id="data-title">备份与清除</h4>
          <div class="data-actions"><button type="button" class="btn-ghost" data-action="export">导出备份</button><button type="button" class="btn-ghost" data-action="import">导入备份</button><input name="importFile" type="file" accept="application/json,.json" hidden /></div>
          <div class="danger-zone"><div><strong>清空 Navigator 数据</strong><p>删除同步数据和本机自定义图标，不会清除 Chrome 浏览记录。</p></div><button type="button" class="btn-danger-outline" data-action="clear-data">清空数据</button></div>
        </section>
      </div>
      <footer class="settings-footer"><p class="settings-message" role="status" hidden></p><div class="dialog-actions"><button type="button" class="btn-ghost" data-action="close">取消</button><button type="button" class="btn-primary" data-action="save">保存设置</button></div></footer>
    </div>`;

  const field = (name) => dlg.querySelector(`[name="${name}"]`);
  const message = dlg.querySelector('.settings-message');
  let remainingBlocked = blocked.length;
  const blockedCount = dlg.querySelector('.blocked-head span');
  const restoreAllButton = dlg.querySelector('[data-action="restore-all"]');
  const updateBlockedCount = () => {
    blockedCount.textContent = remainingBlocked ? `${remainingBlocked} 个网站` : '暂无屏蔽网站';
    if (!remainingBlocked) restoreAllButton?.remove();
  };
  (dlg.querySelector(`[name="theme"][value="${settings.theme}"]`) || dlg.querySelector('[name="theme"]')).checked = true;
  field('accent').value = settings.accent || '#5b6ff5';
  field('engine').value = settings.engine;
  field('customEngine').value = settings.customEngine;
  field('faviconSource').value = settings.faviconSource;
  field('recommendEnabled').checked = settings.recommendEnabled;
  const recommendWindowDays = RECOMMEND_WINDOWS.some((entry) => entry.value === Number(settings.recommendWindowDays))
    ? Number(settings.recommendWindowDays)
    : DEFAULT_SETTINGS.recommendWindowDays;
  field('recommendWindowDays').value = String(recommendWindowDays);
  const recommendMode = [...dlg.querySelectorAll('[name="recommendMode"]')]
    .find((input) => input.value === settings.recommendMode)
    || dlg.querySelector(`[name="recommendMode"][value="${DEFAULT_SETTINGS.recommendMode}"]`);
  recommendMode.checked = true;

  const showMessage = (text, success = false) => {
    message.textContent = text;
    message.hidden = false;
    message.classList.toggle('is-success', success);
  };
  const customRow = dlg.querySelector('[data-row="custom-engine"]');
  const syncCustomRow = () => { customRow.hidden = field('engine').value !== 'custom'; };
  field('engine').addEventListener('change', syncCustomRow);
  syncCustomRow();
  dlg.querySelector('[data-action="reset-accent"]').onclick = () => {
    field('accent').dataset.reset = '1';
    field('accent').value = '#5b6ff5';
  };
  field('accent').addEventListener('input', () => delete field('accent').dataset.reset);
  dlg.querySelectorAll('[data-action="close"]').forEach((button) => { button.onclick = () => done(); });

  dlg.querySelector('[data-action="save"]').onclick = async () => {
    const next = {
      ...settings,
      theme: dlg.querySelector('[name="theme"]:checked')?.value || DEFAULT_SETTINGS.theme,
      accent: field('accent').dataset.reset ? '' : field('accent').value,
      engine: field('engine').value,
      customEngine: field('customEngine').value.trim() || DEFAULT_SETTINGS.customEngine,
      faviconSource: field('faviconSource').value,
      recommendEnabled: field('recommendEnabled').checked,
      recommendWindowDays: Number(field('recommendWindowDays').value),
      recommendMode: dlg.querySelector('[name="recommendMode"]:checked')?.value || DEFAULT_SETTINGS.recommendMode,
    };
    const result = await handlers.onApply(next);
    if (result?.ok === false) {
      showMessage(result.message);
      field('recommendEnabled').checked = false;
      return;
    }
    done();
  };

  dlg.querySelector('[data-action="revoke-history"]')?.addEventListener('click', async (event) => {
    event.currentTarget.disabled = true;
    await handlers.onRevokeHistory();
    done();
  });
  dlg.querySelector('[data-action="import-bookmarks"]').onclick = async (event) => {
    event.currentTarget.disabled = true;
    const result = await handlers.onImportBookmarks();
    if (result?.ok === false) {
      event.currentTarget.disabled = false;
      showMessage(result.message);
      return;
    }
    if (result?.ok) done();
    else event.currentTarget.disabled = false;
  };
  dlg.querySelector('[data-action="restore-import"]')?.addEventListener('click', async (event) => {
    event.currentTarget.disabled = true;
    const restored = await handlers.onRestoreImport();
    if (restored) done();
    else showMessage('没有可恢复的导入快照');
  });
  dlg.querySelector('[data-action="revoke-bookmarks"]')?.addEventListener('click', async (event) => {
    event.currentTarget.disabled = true;
    await handlers.onRevokeBookmarks();
    event.currentTarget.remove();
    showMessage('已撤销 Chrome 书签权限', true);
  });
  dlg.querySelectorAll('[data-restore]').forEach((button) => {
    button.onclick = async () => {
      await handlers.onRestoreBlocked(button.dataset.restore);
      button.closest('.blocked-item').remove();
      remainingBlocked = Math.max(0, remainingBlocked - 1);
      updateBlockedCount();
      showMessage('已恢复推荐', true);
    };
  });
  dlg.querySelector('[data-action="restore-all"]')?.addEventListener('click', async () => {
    await handlers.onRestoreBlocked(null);
    dlg.querySelector('.blocked-list').textContent = '';
    remainingBlocked = 0;
    updateBlockedCount();
    showMessage('已恢复全部网站', true);
  });

  dlg.querySelector('[data-action="export"]').onclick = async () => {
    const payload = await exportAll();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `navigator-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    showMessage('备份已导出', true);
  };
  dlg.querySelector('[data-action="import"]').onclick = () => field('importFile').click();
  field('importFile').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const importedState = await importAll(JSON.parse(await file.text()));
      await handlers.onImported(importedState);
      done();
    } catch (error) {
      showMessage(`导入失败：${error.message}`);
    }
  });

  let clearArmed = false;
  const clearButton = dlg.querySelector('[data-action="clear-data"]');
  clearButton.onclick = async () => {
    if (!clearArmed) {
      clearArmed = true;
      clearButton.textContent = '再次点击确认';
      clearButton.classList.add('armed');
      showMessage('此操作会删除全部 Navigator 数据，请再次点击确认。');
      return;
    }
    clearButton.disabled = true;
    await handlers.onClearData();
    done();
  };

  dlg.addEventListener('click', (event) => { if (event.target === dlg) done(); });
  dlg.addEventListener('cancel', (event) => { event.preventDefault(); done(); });
  document.body.append(dlg);
  dlg.showModal();

  function done() {
    dlg.close();
    dlg.remove();
  }
}

function faviconLabel(id) {
  return FAVICON_SOURCES.find((source) => source.id === id)?.label || '外部图标服务';
}

function displayOrigin(origin) {
  try { return new URL(origin).hostname; } catch { return origin; }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
