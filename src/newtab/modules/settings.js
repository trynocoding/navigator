// 设置弹窗：主题、主题色、搜索引擎、图标源、推荐开关、导入导出
// 保存时通过 onApply 回调把新配置交还 main 应用

import { ENGINES, THEMES, FAVICON_SOURCES, DEFAULT_SETTINGS } from '../../shared/constants.js';
import { exportAll, importAll } from '../../shared/storage.js';

export function openSettingsDialog(settings, handlers) {
  const dlg = document.createElement('dialog');
  dlg.className = 'settings-dialog';
  dlg.setAttribute('aria-labelledby', 'settings-dialog-title');
  dlg.innerHTML = `
    <div class="settings-shell">
      <header class="settings-head">
        <div>
          <h3 id="settings-dialog-title">个性化设置</h3>
          <p>调整外观、搜索与隐私选项</p>
        </div>
        <button type="button" class="quiet-icon" data-action="close" aria-label="关闭设置">×</button>
      </header>

      <div class="settings-body">
        <section class="settings-section" aria-labelledby="appearance-title">
          <h4 id="appearance-title">外观</h4>
          <div class="theme-grid" aria-label="主题">
            ${THEMES.map((t) => `
              <label class="theme-option">
                <input type="radio" name="theme" value="${t.id}" />
                <span class="theme-card">
                  <span class="theme-swatch" data-theme-preview="${t.id}"></span>
                  <span>${t.label}</span>
                </span>
              </label>`).join('')}
          </div>
          <div class="form-row" style="margin-top:16px">
            <label for="settings-accent">自定义强调色</label>
            <div class="accent-row">
              <input id="settings-accent" name="accent" type="color" />
              <button type="button" class="btn-ghost" data-action="reset-accent">使用主题默认色</button>
            </div>
          </div>
        </section>

        <section class="settings-section" aria-labelledby="search-title">
          <h4 id="search-title">搜索与图标</h4>
          <div class="form-row">
            <label for="settings-engine">默认搜索引擎</label>
            <select id="settings-engine" name="engine">
              ${Object.entries(ENGINES).map(([id, e]) => `<option value="${id}">${e.label}</option>`).join('')}
            </select>
          </div>
          <div class="form-row" data-row="custom-engine" hidden>
            <label for="settings-custom-engine">自定义搜索地址</label>
            <input id="settings-custom-engine" name="customEngine" type="text" placeholder="https://example.com/search?q=%s" aria-describedby="custom-engine-hint" />
            <p class="form-hint" id="custom-engine-hint">使用 %s 作为搜索关键词占位符</p>
          </div>
          <div class="form-row">
            <label for="settings-favicon">网站图标来源</label>
            <select id="settings-favicon" name="faviconSource">
              ${FAVICON_SOURCES.map((s) => `<option value="${s.id}">${s.label}</option>`).join('')}
            </select>
            <p class="form-hint">选择外部图标服务时，网站域名会发送给对应服务。</p>
          </div>
        </section>

        <section class="settings-section" aria-labelledby="smart-title">
          <h4 id="smart-title">推荐</h4>
          <label class="switch-row" for="settings-recommend">
            <input id="settings-recommend" name="recommendEnabled" type="checkbox" />
            <span class="switch-track" aria-hidden="true"></span>
            <span class="switch-copy">
              <strong>自动发现常去网站</strong>
              <span>需要浏览记录权限，基于最近 30 天数据并仅在本机分析</span>
            </span>
          </label>
        </section>

        <section class="settings-section" aria-labelledby="data-title">
          <h4 id="data-title">数据管理</h4>
          <div class="data-actions">
            <button type="button" class="btn-ghost" data-action="export">导出备份</button>
            <button type="button" class="btn-ghost" data-action="import">导入备份</button>
            <input name="importFile" type="file" accept="application/json,.json" hidden />
          </div>
          <p class="form-hint">配置保存在 Chrome 同步存储中，不经过 Navigator 自有服务器。</p>
        </section>
      </div>

      <footer class="settings-footer">
        <p class="settings-message" role="status" hidden></p>
        <div class="dialog-actions">
          <button type="button" class="btn-ghost" data-action="close">取消</button>
          <button type="button" class="btn-primary" data-action="save">保存设置</button>
        </div>
      </footer>
    </div>`;

  const $ = (name) => dlg.querySelector(`[name="${name}"]`);

  const selectedTheme = dlg.querySelector(`[name="theme"][value="${settings.theme}"]`)
    || dlg.querySelector('[name="theme"]');
  selectedTheme.checked = true;
  $('accent').value = settings.accent || '#5b6ff5';
  $('engine').value = settings.engine;
  $('customEngine').value = settings.customEngine;
  $('faviconSource').value = settings.faviconSource;
  $('recommendEnabled').checked = settings.recommendEnabled;

  const customRow = dlg.querySelector('[data-row="custom-engine"]');
  const syncCustomRow = () => {
    customRow.hidden = $('engine').value !== 'custom';
  };
  $('engine').addEventListener('change', syncCustomRow);
  syncCustomRow();

  dlg.querySelector('[data-action="reset-accent"]').onclick = () => {
    // 置回默认占位色并标记清除
    $('accent').dataset.reset = '1';
    $('accent').value = '#5b6ff5';
  };
  $('accent').addEventListener('input', () => delete $('accent').dataset.reset);

  dlg.querySelectorAll('[data-action="close"]').forEach((button) => {
    button.onclick = () => done();
  });
  dlg.querySelector('[data-action="save"]').onclick = async () => {
    const next = {
      ...settings,
      theme: dlg.querySelector('[name="theme"]:checked')?.value || DEFAULT_SETTINGS.theme,
      accent: $('accent').dataset.reset ? '' : $('accent').value,
      engine: $('engine').value,
      customEngine: $('customEngine').value.trim() || DEFAULT_SETTINGS.customEngine,
      faviconSource: $('faviconSource').value,
      recommendEnabled: $('recommendEnabled').checked,
    };
    const result = await handlers.onApply(next);
    if (result?.ok === false) {
      const message = dlg.querySelector('.settings-message');
      message.textContent = result.message;
      message.hidden = false;
      $('recommendEnabled').checked = false;
      return;
    }
    done();
  };

  dlg.querySelector('[data-action="export"]').onclick = async () => {
    const payload = await exportAll();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `navigator-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  dlg.querySelector('[data-action="import"]').onclick = () => $('importFile').click();
  $('importFile').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      const state = await importAll(payload);
      await handlers.onApply(state.settings, { imported: true });
      done();
    } catch (err) {
      alert(`导入失败：${err.message}`);
    }
  });

  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) done();
  });
  dlg.addEventListener('cancel', (e) => {
    e.preventDefault();
    done();
  });

  document.body.append(dlg);
  dlg.showModal();

  function done() {
    dlg.close();
    dlg.remove();
  }
}
