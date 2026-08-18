// 新增/编辑站点对话框：原生 <dialog>，返回 Promise<值 | null>

import { hostOf } from '../../shared/storage.js';

const MAX_ICON_FILE_SIZE = 5 * 1024 * 1024;
const ICON_SIZE = 128;
const SUPPORTED_ICON_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/x-icon',
  'image/vnd.microsoft.icon',
]);

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
      <div class="form-row">
        <span class="field-label" id="shortcut-icon-label">自定义图标（可选）</span>
        <div class="shortcut-icon-editor" aria-labelledby="shortcut-icon-label">
          <span class="shortcut-icon-preview" data-icon-preview>
            <img alt="自定义图标预览" hidden />
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5h16v13H4z"/><path d="m4 15 4.5-4.5 3.5 3 2.5-2.5 5.5 5.5"/><circle cx="15.5" cy="9" r="1.5"/></svg>
          </span>
          <div class="shortcut-icon-controls">
            <input id="shortcut-icon-file" name="iconFile" type="file" hidden accept=".png,.jpg,.jpeg,.webp,.gif,.ico,image/png,image/jpeg,image/webp,image/gif,image/x-icon,image/vnd.microsoft.icon" />
            <div class="shortcut-icon-buttons">
              <button type="button" class="btn-ghost" data-action="choose-icon">选择图片</button>
              <button type="button" class="btn-ghost" data-action="remove-icon">恢复网站图标</button>
            </div>
            <p class="form-hint">支持 PNG、JPG、WebP、GIF 或 ICO，图片会自动缩放。</p>
            <p class="icon-message" role="status" aria-live="polite" hidden></p>
          </div>
        </div>
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
  const fileInput = form.elements.namedItem('iconFile');
  const saveButton = dlg.querySelector('[data-action="save"]');
  const chooseIconButton = dlg.querySelector('[data-action="choose-icon"]');
  const removeIconButton = dlg.querySelector('[data-action="remove-icon"]');
  const iconPreview = dlg.querySelector('[data-icon-preview]');
  const previewImage = iconPreview.querySelector('img');
  const iconMessage = dlg.querySelector('.icon-message');
  let customIcon = existing?.customIcon || '';
  let processingIcon = false;
  titleInput.value = existing?.title || '';
  urlInput.value = existing?.url || '';
  renderIconPreview();
  document.body.append(dlg);
  dlg.showModal();

  return new Promise((resolve) => {
    const finish = (value) => {
      dlg.close();
      dlg.remove();
      resolve(value);
    };

    const save = () => {
      if (processingIcon) return;
      const url = normalizeUrl(urlInput.value.trim());
      if (!url) {
        urlInput.setCustomValidity('请输入有效的网址');
        urlInput.reportValidity();
        return;
      }
      urlInput.setCustomValidity('');
      const result = {
        id: existing?.id,
        title: titleInput.value.trim() || hostOf(url) || url,
        url,
      };
      if (customIcon) result.customIcon = customIcon;
      finish(result);
    };

    chooseIconButton.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async () => {
      const [file] = fileInput.files;
      fileInput.value = '';
      if (!file) return;

      processingIcon = true;
      saveButton.disabled = true;
      showIconMessage('正在处理图片…');
      try {
        customIcon = await resizeIcon(file);
        renderIconPreview();
        showIconMessage('已添加自定义图标', false);
      } catch (error) {
        showIconMessage(error.message || '无法读取这张图片');
      } finally {
        processingIcon = false;
        saveButton.disabled = false;
      }
    });

    removeIconButton.addEventListener('click', () => {
      customIcon = '';
      renderIconPreview();
      showIconMessage('保存后将恢复使用网站图标', false);
    });

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

  function renderIconPreview() {
    previewImage.hidden = !customIcon;
    iconPreview.classList.toggle('has-image', Boolean(customIcon));
    removeIconButton.hidden = !customIcon;
    if (customIcon) previewImage.src = customIcon;
    else previewImage.removeAttribute('src');
  }

  function showIconMessage(message, isError = true) {
    iconMessage.hidden = !message;
    iconMessage.textContent = message;
    iconMessage.classList.toggle('is-success', !isError);
  }
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

async function resizeIcon(file) {
  const extensionIsSupported = /\.(?:png|jpe?g|webp|gif|ico)$/i.test(file.name);
  if (!SUPPORTED_ICON_TYPES.has(file.type) && !extensionIsSupported) {
    throw new Error('请选择 PNG、JPG、WebP、GIF 或 ICO 图片');
  }
  if (file.size > MAX_ICON_FILE_SIZE) {
    throw new Error('图片不能超过 5MB');
  }

  const image = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = ICON_SIZE;
  canvas.height = ICON_SIZE;
  const context = canvas.getContext('2d');
  const scale = Math.min(ICON_SIZE / image.naturalWidth, ICON_SIZE / image.naturalHeight);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, (ICON_SIZE - width) / 2, (ICON_SIZE - height) / 2, width, height);

  const png = canvas.toDataURL('image/png');
  const webp = canvas.toDataURL('image/webp', 0.9);
  return webp.startsWith('data:image/webp') && webp.length < png.length ? webp : png;
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    const cleanup = () => URL.revokeObjectURL(objectUrl);
    image.onload = () => {
      cleanup();
      resolve(image);
    };
    image.onerror = () => {
      cleanup();
      reject(new Error('图片格式无效或已损坏'));
    };
    image.src = objectUrl;
  });
}
