// 自定义快捷区：渲染、增删改、右键菜单、拖拽排序

import { makeIconEl } from '../../shared/favicon.js';
import { openEditDialog } from './edit-dialog.js';
import { saveShortcuts } from '../../shared/storage.js';

export class Shortcuts {
  constructor(container, emptyHint) {
    this.grid = container;
    this.emptyHint = emptyHint;
    this.shortcuts = [];
    this.faviconSource = 'chrome';
    this.dragId = null;
  }

  setState(shortcuts, faviconSource) {
    this.shortcuts = shortcuts;
    this.faviconSource = faviconSource;
    this.render();
  }

  render() {
    this.grid.textContent = '';
    this.emptyHint.hidden = this.shortcuts.length > 0;

    for (const s of this.shortcuts) {
      this.grid.append(this.makeTile(s));
    }
  }

  makeTile(s) {
    const wrap = document.createElement('div');
    wrap.className = 'tile-wrap';
    wrap.draggable = true;
    wrap.dataset.id = s.id;

    const a = document.createElement('a');
    a.className = 'tile';
    a.href = s.url;
    a.title = `${s.title}\n${s.url}`;

    a.append(makeIconEl(s.url, this.faviconSource, s.title, s.customIcon));
    const name = document.createElement('span');
    name.className = 'tile-title';
    name.textContent = s.title;
    a.append(name);

    const more = document.createElement('button');
    more.className = 'tile-more';
    more.type = 'button';
    more.title = `管理 ${s.title}`;
    more.setAttribute('aria-label', `管理 ${s.title}`);
    more.setAttribute('aria-haspopup', 'menu');
    more.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>';
    more.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const rect = more.getBoundingClientRect();
      this.openMenu(rect.right, rect.bottom + 6, s);
    });

    wrap.addEventListener('dragstart', (e) => {
      this.dragId = s.id;
      wrap.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    wrap.addEventListener('dragend', () => {
      this.dragId = null;
      wrap.classList.remove('dragging');
    });
    wrap.addEventListener('dragover', (e) => {
      if (this.dragId && this.dragId !== s.id) {
        e.preventDefault();
        wrap.classList.add('drop-target');
      }
    });
    wrap.addEventListener('dragleave', () => wrap.classList.remove('drop-target'));
    wrap.addEventListener('drop', (e) => {
      e.preventDefault();
      wrap.classList.remove('drop-target');
      this.moveBefore(this.dragId, s.id);
    });
    wrap.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.openMenu(e.clientX, e.clientY, s);
    });

    wrap.append(a, more);
    return wrap;
  }

  moveBefore(fromId, toId) {
    const from = this.shortcuts.findIndex((s) => s.id === fromId);
    const to = this.shortcuts.findIndex((s) => s.id === toId);
    if (from < 0 || to < 0) return;
    const [item] = this.shortcuts.splice(from, 1);
    this.shortcuts.splice(to, 0, item);
    this.persist();
  }

  openMenu(x, y, s) {
    closeMenu();
    const menu = document.createElement('div');
    menu.className = 'ctx-menu';
    menu.setAttribute('role', 'menu');

    const mk = (label, fn, cls = '') => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'menuitem');
      b.textContent = label;
      b.className = cls;
      b.onclick = () => {
        closeMenu();
        fn();
      };
      menu.append(b);
    };

    mk('打开', () => {
      window.location.href = s.url;
    });
    mk('新窗口打开', () => window.open(s.url, '_blank', 'noopener'));
    mk('编辑', () => this.edit(s));
    mk('置顶', () => this.moveBefore(s.id, this.shortcuts[0]?.id));
    mk('删除', () => this.remove(s.id), 'danger');

    positionMenu(menu, x, y);
  }

  async add() {
    const result = await openEditDialog(null);
    if (result && result !== 'DELETE') {
      result.id = `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      this.shortcuts.push(result);
      await this.persist();
      return true;
    }
    return false;
  }

  async edit(s) {
    const result = await openEditDialog(s);
    if (!result) return;
    if (result === 'DELETE') {
      this.remove(s.id);
      return;
    }
    const idx = this.shortcuts.findIndex((x) => x.id === s.id);
    if (idx >= 0) {
      this.shortcuts[idx] = result;
      await this.persist();
    }
  }

  remove(id) {
    this.shortcuts = this.shortcuts.filter((s) => s.id !== id);
    this.persist();
  }

  // 供推荐区「固定」调用
  async pin({ origin, host, title }) {
    const exists = this.shortcuts.some((s) => {
      try {
        return new URL(s.url).origin === origin;
      } catch {
        return false;
      }
    });
    if (exists) return false;
    this.shortcuts.push({
      id: `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      title: (title || host || origin).slice(0, 40),
      url: origin,
    });
    await this.persist();
    return true;
  }

  get pinnedOrigins() {
    return this.shortcuts
      .map((s) => {
        try {
          return new URL(s.url).origin;
        } catch {
          return '';
        }
      })
      .filter(Boolean);
  }

  async persist() {
    this.render();
    await saveShortcuts(this.shortcuts);
  }
}

// ---- 全局唯一的右键菜单 ----

let activeMenu = null;

function positionMenu(menu, x, y) {
  document.body.append(menu);
  const rect = menu.getBoundingClientRect();
  menu.style.left = `${Math.min(x, window.innerWidth - rect.width - 8)}px`;
  menu.style.top = `${Math.min(y, window.innerHeight - rect.height - 8)}px`;
  activeMenu = menu;
  menu.querySelector('button')?.focus();
}

function closeMenu() {
  activeMenu?.remove();
  activeMenu = null;
}

document.addEventListener('click', closeMenu);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeMenu();
});
window.addEventListener('blur', closeMenu);
