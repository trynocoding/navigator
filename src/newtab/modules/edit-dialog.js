// 新增/编辑站点对话框：原生 <dialog>，返回 Promise<值 | null>

import { hostOf } from '../../shared/storage.js';

export function openEditDialog(existing) {
  const dlg = document.createElement('dialog');
  dlg.className = 'edit-dialog';
  dlg.setAttribute('aria-labelledby', 'shortcut-dialog-title');
  dlg.innerHTML = `
    <h3 id="shortcut-dialog-title">${existing ? '编辑快捷方式' : '添加快捷方式'}</h3>
    <form method="dialog">
      <div class="form-row">
        <label for="shortcut-title">名称</label>
        <input id="shortcut-title" name="title" type="text" placeholder="留空则自动使用域名" maxlength="40" />
      </div>
      <div class="form-row">
        <label for="shortcut-url">网址</label>
        <input id="shortcut-url" name="url" type="text" placeholder="例如 github.com" required aria-describedby="shortcut-url-hint" />
        <p class="form-hint" id="shortcut-url-hint">可省略 https://，保存时自动补全</p>
      </div>
      <div class="dialog-actions">
        ${existing ? '<button type="button" class="btn-danger" data-action="delete">删除</button>' : ''}
        <span style="flex:1"></span>
        <button type="button" class="btn-ghost" data-action="cancel">取消</button>
        <button type="button" class="btn-primary" data-action="save">保存</button>
      </div>
    </form>`;

  const form = dlg.querySelector('form');
  const titleInput = form.elements.namedItem('title');
  const urlInput = form.elements.namedItem('url');
  titleInput.value = existing?.title || '';
  urlInput.value = existing?.url || '';
  document.body.append(dlg);
  dlg.showModal();

  return new Promise((resolve) => {
    const finish = (value) => {
      dlg.close();
      dlg.remove();
      resolve(value);
    };

    const save = () => {
      const url = normalizeUrl(urlInput.value.trim());
      if (!url) {
        urlInput.setCustomValidity('请输入有效的网址');
        urlInput.reportValidity();
        return;
      }
      urlInput.setCustomValidity('');
      finish({
        id: existing?.id,
        title: titleInput.value.trim() || hostOf(url) || url,
        url,
      });
    };

    urlInput.addEventListener('input', () => urlInput.setCustomValidity(''));
    dlg.querySelector('[data-action="cancel"]').onclick = () => finish(null);
    dlg.querySelector('[data-action="save"]').onclick = save;
    // 回车提交时保存而不是直接关闭
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      save();
    });
    dlg.querySelector('[data-action="delete"]')?.addEventListener('click', () => finish('DELETE'));
    // 点击遮罩关闭
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg) finish(null);
    });
    dlg.addEventListener('cancel', (e) => {
      e.preventDefault();
      finish(null);
    });
  });
}

export function normalizeUrl(input) {
  if (!input) return '';
  const withProto = /^[a-z][a-z0-9+.-]*:\/\//i.test(input) ? input : `https://${input}`;
  try {
    const u = new URL(withProto);
    if (!/^https?:$/.test(u.protocol)) return '';
    return u.href;
  } catch {
    return '';
  }
}
