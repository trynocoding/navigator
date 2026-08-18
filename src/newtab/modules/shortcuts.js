// 快捷区 UI：渲染分组、编辑、拖拽与可撤销删除。

import { makeIconEl } from '../../shared/favicon.js';
import { DEFAULT_GROUP_ID, ShortcutCollection } from '../../shared/shortcut-model.js';
import { saveShortcutState } from '../../shared/storage.js';
import { openEditDialog, openGroupDialog } from './edit-dialog.js';

export class Shortcuts {
  constructor(container, emptyHint, groupBar) {
    this.container = container;
    this.emptyHint = emptyHint;
    this.groupBar = groupBar;
    this.collection = new ShortcutCollection();
    this.faviconSource = 'chrome';
    this.dragId = null;
    this.activeGroupId = 'all';
    this.onChange = null;
    this.onUndo = null;
    this.onNotify = null;
  }

  setState(shortcuts, groups, faviconSource) {
    this.collection.replace(shortcuts, groups);
    this.faviconSource = faviconSource;
    if (this.activeGroupId !== 'all' && !this.collection.hasGroup(this.activeGroupId)) {
      this.activeGroupId = 'all';
    }
    this.render();
  }

  render() {
    this.renderGroupBar();
    this.container.textContent = '';
    const hasShortcuts = this.collection.shortcuts.length > 0;
    this.emptyHint.hidden = hasShortcuts;
    this.container.hidden = !hasShortcuts;
    if (this.groupBar) this.groupBar.hidden = !hasShortcuts;
    if (!hasShortcuts) return;
    const visibleGroups = this.activeGroupId === 'all'
      ? this.collection.groups
      : this.collection.groups.filter((group) => group.id === this.activeGroupId);
    for (const group of visibleGroups) this.container.append(this.makeGroupSection(group));
  }

  renderGroupBar() {
    if (!this.groupBar) return;
    this.groupBar.textContent = '';
    const choices = [
      { id: 'all', title: '全部', count: this.collection.shortcuts.length },
      ...this.collection.groups.map((group) => ({
        ...group,
        count: this.collection.itemsIn(group.id).length,
      })),
    ];
    for (const choice of choices) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'group-chip';
      button.classList.toggle('active', choice.id === this.activeGroupId);
      button.setAttribute('aria-pressed', String(choice.id === this.activeGroupId));
      button.innerHTML = `<span>${escapeHtml(choice.title)}</span><small>${choice.count}</small>`;
      button.onclick = () => {
        this.activeGroupId = choice.id;
        this.render();
      };
      this.groupBar.append(button);
    }
  }

  makeGroupSection(group) {
    const section = document.createElement('section');
    section.className = 'shortcut-group';
    section.dataset.groupId = group.id;

    const header = document.createElement('header');
    header.className = 'shortcut-group-head';
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'group-toggle';
    toggle.setAttribute('aria-expanded', String(!group.collapsed));
    toggle.innerHTML = `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m6 8 4 4 4-4"/></svg><strong>${escapeHtml(group.title)}</strong><span>${this.collection.itemsIn(group.id).length}</span>`;
    toggle.onclick = async () => {
      this.collection.toggleGroup(group.id);
      await this.persist();
    };
    header.append(toggle);

    const manage = document.createElement('button');
    manage.type = 'button';
    manage.className = 'group-manage';
    manage.setAttribute('aria-label', `管理分组 ${group.title}`);
    manage.textContent = '•••';
    manage.onclick = (event) => {
      const rect = event.currentTarget.getBoundingClientRect();
      this.openGroupMenu(rect.right, rect.bottom + 6, group);
    };
    header.append(manage);
    section.append(header);

    const grid = document.createElement('div');
    grid.className = 'grid shortcut-group-grid';
    grid.hidden = group.collapsed;
    grid.addEventListener('dragover', (event) => {
      if (!this.dragId) return;
      event.preventDefault();
      grid.classList.add('group-drop-target');
    });
    grid.addEventListener('dragleave', (event) => {
      if (!grid.contains(event.relatedTarget)) grid.classList.remove('group-drop-target');
    });
    grid.addEventListener('drop', async (event) => {
      event.preventDefault();
      grid.classList.remove('group-drop-target');
      if (event.target.closest('.tile-wrap')) return;
      if (this.collection.moveToGroup(this.dragId, group.id)) await this.persist();
    });

    const items = this.collection.itemsIn(group.id);
    for (const shortcut of items) grid.append(this.makeTile(shortcut));
    if (!items.length) {
      const hint = document.createElement('p');
      hint.className = 'group-empty';
      hint.textContent = '拖入快捷方式，或在这里添加';
      grid.append(hint);
    }
    section.append(grid);
    return section;
  }

  makeTile(shortcut) {
    const wrap = document.createElement('div');
    wrap.className = 'tile-wrap';
    wrap.draggable = true;
    wrap.dataset.id = shortcut.id;
    const link = document.createElement('a');
    link.className = 'tile';
    link.href = shortcut.url;
    link.title = `${shortcut.title}\n${shortcut.url}`;
    link.append(makeIconEl(shortcut.url, this.faviconSource, shortcut.title, shortcut.customIcon));
    const name = document.createElement('span');
    name.className = 'tile-title';
    name.textContent = shortcut.title;
    link.append(name);

    const more = document.createElement('button');
    more.className = 'tile-more';
    more.type = 'button';
    more.title = `管理 ${shortcut.title}`;
    more.setAttribute('aria-label', `管理 ${shortcut.title}`);
    more.setAttribute('aria-haspopup', 'menu');
    more.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>';
    more.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      const rect = more.getBoundingClientRect();
      this.openMenu(rect.right, rect.bottom + 6, shortcut);
    };

    wrap.addEventListener('dragstart', (event) => {
      this.dragId = shortcut.id;
      wrap.classList.add('dragging');
      event.dataTransfer.effectAllowed = 'move';
    });
    wrap.addEventListener('dragend', () => {
      this.dragId = null;
      wrap.classList.remove('dragging');
      document.querySelectorAll('.group-drop-target').forEach((element) => element.classList.remove('group-drop-target'));
    });
    wrap.addEventListener('dragover', (event) => {
      if (this.dragId && this.dragId !== shortcut.id) {
        event.preventDefault();
        event.stopPropagation();
        wrap.classList.add('drop-target');
      }
    });
    wrap.addEventListener('dragleave', () => wrap.classList.remove('drop-target'));
    wrap.addEventListener('drop', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      wrap.classList.remove('drop-target');
      if (this.collection.moveBefore(this.dragId, shortcut.id, shortcut.groupId)) await this.persist();
    });
    wrap.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      this.openMenu(event.clientX, event.clientY, shortcut);
    });
    wrap.append(link, more);
    return wrap;
  }

  openMenu(x, y, shortcut) {
    closeMenu();
    const menu = makeMenu();
    addMenuItem(menu, '打开', () => { window.location.href = shortcut.url; });
    addMenuItem(menu, '新标签页打开', () => window.open(shortcut.url, '_blank', 'noopener'));
    addMenuItem(menu, '编辑', () => this.edit(shortcut));
    for (const group of this.collection.groups) {
      if (group.id !== shortcut.groupId) {
        addMenuItem(menu, `移至 · ${group.title}`, async () => {
          this.collection.moveToGroup(shortcut.id, group.id);
          await this.persist();
        });
      }
    }
    addMenuItem(menu, '置于分组顶部', async () => {
      const first = this.collection.itemsIn(shortcut.groupId)[0];
      if (first && first.id !== shortcut.id) {
        this.collection.moveBefore(shortcut.id, first.id, shortcut.groupId);
        await this.persist();
      }
    });
    addMenuItem(menu, '删除', () => this.remove(shortcut.id), 'danger');
    positionMenu(menu, x, y);
  }

  openGroupMenu(x, y, group) {
    closeMenu();
    const menu = makeMenu();
    addMenuItem(menu, '重命名', async () => {
      const title = await openGroupDialog(group.title);
      if (title && this.collection.renameGroup(group.id, title)) await this.persist();
    });
    addMenuItem(menu, group.collapsed ? '展开' : '折叠', async () => {
      this.collection.toggleGroup(group.id);
      await this.persist();
    });
    if (group.id !== DEFAULT_GROUP_ID) {
      addMenuItem(menu, '删除分组', async () => {
        this.collection.deleteGroup(group.id);
        if (this.activeGroupId === group.id) this.activeGroupId = 'all';
        await this.persist();
        this.onNotify?.('分组已删除，其中的网站已移至“常用”');
      }, 'danger');
    }
    positionMenu(menu, x, y);
  }

  async add() {
    const groupId = this.activeGroupId === 'all' ? DEFAULT_GROUP_ID : this.activeGroupId;
    const result = await openEditDialog(null, {
      groups: this.collection.groups,
      groupId,
      validate: (candidate) => duplicateMessage(this.collection.findDuplicate(candidate.url)),
    });
    if (!result || result === 'DELETE') return false;
    const added = this.collection.add(result, result.groupId);
    if (!added.ok) {
      this.onNotify?.(duplicateMessage(added.duplicate));
      return false;
    }
    await this.persist();
    return true;
  }

  async addGroup() {
    const title = await openGroupDialog();
    if (!title) return false;
    const result = this.collection.addGroup(title);
    if (!result.ok) {
      this.onNotify?.(result.reason === 'duplicate' ? '已经有同名分组' : '请输入分组名称');
      return false;
    }
    this.activeGroupId = result.group.id;
    await this.persist();
    this.onNotify?.(`已创建分组“${result.group.title}”`);
    return true;
  }

  async edit(shortcut) {
    const result = await openEditDialog(shortcut, {
      groups: this.collection.groups,
      validate: (candidate) => duplicateMessage(this.collection.findDuplicate(candidate.url, shortcut.id)),
    });
    if (!result) return;
    if (result === 'DELETE') {
      await this.remove(shortcut.id);
      return;
    }
    const updated = this.collection.update(shortcut.id, result);
    if (!updated.ok) {
      this.onNotify?.(duplicateMessage(updated.duplicate));
      return;
    }
    await this.persist();
  }

  async remove(id) {
    const change = this.collection.remove(id);
    if (!change) return;
    await this.persist();
    this.onUndo?.(`已删除“${change.item.title}”`, async () => {
      this.collection.restore(change);
      await this.persist();
    });
  }

  async pin({ origin, host, title }) {
    const exists = this.collection.shortcuts.find((shortcut) => {
      try { return new URL(shortcut.url).origin === origin; } catch { return false; }
    });
    if (exists) {
      this.onNotify?.(`“${exists.title}”已在快捷方式中`);
      return false;
    }
    this.collection.add({ title: (title || host || origin).slice(0, 40), url: origin }, DEFAULT_GROUP_ID);
    await this.persist();
    return true;
  }

  search(query, limit) { return this.collection.search(query, limit); }
  get pinnedOrigins() { return this.collection.pinnedOrigins; }
  get shortcuts() { return this.collection.shortcuts; }
  get groups() { return this.collection.groups; }

  async persist() {
    this.render();
    await saveShortcutState(this.collection.snapshot());
    await this.onChange?.(this.collection.snapshot());
  }
}

function duplicateMessage(duplicate) {
  return duplicate ? `这个网址已保存为“${duplicate.title}”` : '';
}

function makeMenu() {
  const menu = document.createElement('div');
  menu.className = 'ctx-menu';
  menu.setAttribute('role', 'menu');
  return menu;
}

function addMenuItem(menu, label, action, className = '') {
  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('role', 'menuitem');
  button.textContent = label;
  button.className = className;
  button.onclick = () => {
    closeMenu();
    action();
  };
  menu.append(button);
}

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

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

document.addEventListener('click', closeMenu);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeMenu();
});
window.addEventListener('blur', closeMenu);
