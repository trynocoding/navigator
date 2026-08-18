import { ShortcutCollection } from '../../shared/shortcut-model.js';
import { selectBookmarkCandidates } from '../../shared/bookmark-import.js';

export function openBookmarkImportDialog({ folders, invalid = [], shortcuts, groups }) {
  const dlg = document.createElement('dialog');
  dlg.className = 'bookmark-import-dialog';
  dlg.setAttribute('aria-labelledby', 'bookmark-import-title');
  dlg.innerHTML = `
    <div class="import-shell">
      <header class="settings-head">
        <div><h3 id="bookmark-import-title">从 Chrome 导入书签</h3><p>按文件夹选择，导入前会预览并自动去重</p></div>
        <button type="button" class="quiet-icon" data-action="close" aria-label="关闭书签导入">×</button>
      </header>
      <div class="import-body">
        <div class="import-toolbar">
          <label for="bookmark-target-group">导入到</label>
          <select id="bookmark-target-group">${groups.map((group) => `<option value="${escapeHtml(group.id)}">${escapeHtml(group.title)}</option>`).join('')}</select>
          <button type="button" class="text-button" data-action="select-all">全选</button>
          <button type="button" class="text-button" data-action="select-none">清空</button>
        </div>
        <div class="bookmark-folder-list">
          ${folders.length ? folders.map((folder) => `
            <article class="bookmark-folder">
              <label>
                <input type="checkbox" name="bookmarkFolder" value="${escapeHtml(folder.id)}" />
                <span><strong>${escapeHtml(folder.path)}</strong><small>${folder.bookmarks.length} 个可导入书签</small></span>
              </label>
              <details><summary>预览内容</summary><ul>${folder.bookmarks.slice(0, 8).map((bookmark) => `<li><span>${escapeHtml(bookmark.title)}</span><small>${escapeHtml(safeHost(bookmark.url))}</small></li>`).join('')}${folder.bookmarks.length > 8 ? `<li class="more">另有 ${folder.bookmarks.length - 8} 个</li>` : ''}</ul></details>
            </article>`).join('') : '<p class="empty-hint">Chrome 书签中没有可导入的网页。</p>'}
        </div>
        ${invalid.length ? `<p class="import-invalid">已自动排除 ${invalid.length} 个浏览器内部页或无效地址。</p>` : ''}
      </div>
      <footer class="import-footer">
        <div class="import-summary" role="status" aria-live="polite"><strong>请选择书签文件夹</strong><span>不会修改 Chrome 原书签</span></div>
        <div class="dialog-actions"><button type="button" class="btn-ghost" data-action="close">取消</button><button type="button" class="btn-primary" data-action="import" disabled>导入</button></div>
      </footer>
    </div>`;

  document.body.append(dlg);
  dlg.showModal();
  const checkboxes = [...dlg.querySelectorAll('[name="bookmarkFolder"]')];
  const groupSelect = dlg.querySelector('#bookmark-target-group');
  const importButton = dlg.querySelector('[data-action="import"]');
  const summary = dlg.querySelector('.import-summary');
  let preview = null;

  const updatePreview = () => {
    const selectedIds = checkboxes.filter((checkbox) => checkbox.checked).map((checkbox) => checkbox.value);
    const candidates = selectBookmarkCandidates(folders, selectedIds);
    const copy = new ShortcutCollection(shortcuts, groups);
    preview = copy.addMany(candidates, groupSelect.value);
    if (!candidates.length) {
      summary.innerHTML = '<strong>请选择书签文件夹</strong><span>不会修改 Chrome 原书签</span>';
      importButton.disabled = true;
      return;
    }
    summary.innerHTML = `<strong>将新增 ${preview.added.length} 个</strong><span>${preview.duplicates.length} 个重复将跳过${invalid.length ? ` · ${invalid.length} 个无效已排除` : ''}</span>`;
    importButton.disabled = preview.added.length === 0;
  };

  checkboxes.forEach((checkbox) => checkbox.addEventListener('change', updatePreview));
  groupSelect.addEventListener('change', updatePreview);
  dlg.querySelector('[data-action="select-all"]').onclick = () => {
    checkboxes.forEach((checkbox) => { checkbox.checked = true; });
    updatePreview();
  };
  dlg.querySelector('[data-action="select-none"]').onclick = () => {
    checkboxes.forEach((checkbox) => { checkbox.checked = false; });
    updatePreview();
  };

  return new Promise((resolve) => {
    const finish = (value) => {
      dlg.close();
      dlg.remove();
      resolve(value);
    };
    dlg.querySelectorAll('[data-action="close"]').forEach((button) => { button.onclick = () => finish(null); });
    importButton.onclick = () => {
      const selectedIds = checkboxes.filter((checkbox) => checkbox.checked).map((checkbox) => checkbox.value);
      finish({
        candidates: selectBookmarkCandidates(folders, selectedIds),
        groupId: groupSelect.value,
        preview,
      });
    };
    dlg.addEventListener('cancel', (event) => { event.preventDefault(); finish(null); });
  });
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
