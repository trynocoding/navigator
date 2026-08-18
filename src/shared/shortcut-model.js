// 快捷方式集合模型：统一负责分组、排序、URL 去重与搜索。
// UI 只消费快照和少量操作，避免把数据规则散落在页面事件中。

export const DEFAULT_GROUP_ID = 'default';

const DEFAULT_GROUP = Object.freeze({
  id: DEFAULT_GROUP_ID,
  title: '常用',
  collapsed: false,
});

export class ShortcutCollection {
  constructor(shortcuts = [], groups = []) {
    this.replace(shortcuts, groups);
  }

  replace(shortcuts = [], groups = []) {
    this.groups = normalizeGroups(groups);
    const knownGroups = new Set(this.groups.map((group) => group.id));
    this.shortcuts = shortcuts.map((shortcut) => ({
      ...shortcut,
      groupId: knownGroups.has(shortcut.groupId) ? shortcut.groupId : DEFAULT_GROUP_ID,
    }));
  }

  snapshot() {
    return {
      shortcuts: this.shortcuts.map((shortcut) => ({ ...shortcut })),
      groups: this.groups.map((group) => ({ ...group })),
    };
  }

  itemsIn(groupId) {
    return this.shortcuts.filter((shortcut) => shortcut.groupId === groupId);
  }

  add(input, groupId = DEFAULT_GROUP_ID) {
    if (!isNavigableUrl(input.url)) return { ok: false, reason: 'invalid', input };
    const duplicate = this.findDuplicate(input.url);
    if (duplicate) return { ok: false, reason: 'duplicate', duplicate };
    const item = {
      ...input,
      id: input.id || createId('s'),
      title: String(input.title || '').trim().slice(0, 40) || hostOf(input.url) || input.url,
      groupId: this.hasGroup(groupId) ? groupId : DEFAULT_GROUP_ID,
    };
    this.shortcuts.push(item);
    return { ok: true, item };
  }

  addMany(inputs, groupId = DEFAULT_GROUP_ID) {
    const result = { added: [], duplicates: [], invalid: [] };
    for (const input of Array.isArray(inputs) ? inputs : []) {
      const added = this.add(input, input.groupId || groupId);
      if (added.ok) result.added.push(added.item);
      else if (added.reason === 'duplicate') result.duplicates.push({ input, duplicate: added.duplicate });
      else result.invalid.push(input);
    }
    return result;
  }

  update(id, input) {
    const index = this.shortcuts.findIndex((shortcut) => shortcut.id === id);
    if (index < 0) return { ok: false, reason: 'missing' };
    const duplicate = this.findDuplicate(input.url, id);
    if (duplicate) return { ok: false, reason: 'duplicate', duplicate };
    const item = {
      ...this.shortcuts[index],
      ...input,
      id,
      groupId: this.hasGroup(input.groupId)
        ? input.groupId
        : this.shortcuts[index].groupId,
    };
    this.shortcuts[index] = item;
    return { ok: true, item };
  }

  remove(id) {
    const index = this.shortcuts.findIndex((shortcut) => shortcut.id === id);
    if (index < 0) return null;
    const [item] = this.shortcuts.splice(index, 1);
    return { item, index };
  }

  restore(change) {
    if (!change?.item) return false;
    const index = Math.max(0, Math.min(change.index ?? this.shortcuts.length, this.shortcuts.length));
    this.shortcuts.splice(index, 0, { ...change.item });
    return true;
  }

  moveBefore(fromId, toId, targetGroupId) {
    if (fromId === toId) return false;
    const from = this.shortcuts.findIndex((shortcut) => shortcut.id === fromId);
    if (from < 0) return false;
    const [item] = this.shortcuts.splice(from, 1);
    const resolvedGroup = this.hasGroup(targetGroupId)
      ? targetGroupId
      : this.shortcuts.find((shortcut) => shortcut.id === toId)?.groupId || item.groupId;
    item.groupId = resolvedGroup;
    const to = this.shortcuts.findIndex((shortcut) => shortcut.id === toId);
    this.shortcuts.splice(to < 0 ? this.shortcuts.length : to, 0, item);
    return true;
  }

  moveToGroup(id, groupId) {
    const item = this.shortcuts.find((shortcut) => shortcut.id === id);
    if (!item || !this.hasGroup(groupId) || item.groupId === groupId) return false;
    item.groupId = groupId;
    return true;
  }

  addGroup(title) {
    const cleanTitle = String(title || '').trim().slice(0, 20);
    if (!cleanTitle) return { ok: false, reason: 'empty' };
    const existing = this.groups.find(
      (group) => group.title.toLocaleLowerCase() === cleanTitle.toLocaleLowerCase(),
    );
    if (existing) return { ok: false, reason: 'duplicate', group: existing };
    const group = { id: createId('g'), title: cleanTitle, collapsed: false };
    this.groups.push(group);
    return { ok: true, group };
  }

  renameGroup(id, title) {
    const group = this.groups.find((entry) => entry.id === id);
    const cleanTitle = String(title || '').trim().slice(0, 20);
    if (!group || !cleanTitle) return false;
    group.title = cleanTitle;
    return true;
  }

  toggleGroup(id) {
    const group = this.groups.find((entry) => entry.id === id);
    if (!group) return false;
    group.collapsed = !group.collapsed;
    return true;
  }

  deleteGroup(id) {
    if (id === DEFAULT_GROUP_ID || !this.hasGroup(id)) return false;
    this.shortcuts.forEach((shortcut) => {
      if (shortcut.groupId === id) shortcut.groupId = DEFAULT_GROUP_ID;
    });
    this.groups = this.groups.filter((group) => group.id !== id);
    return true;
  }

  search(query, limit = 6) {
    const needle = String(query || '').trim().toLocaleLowerCase();
    if (!needle) return [];
    const groupNames = new Map(this.groups.map((group) => [group.id, group.title]));
    return this.shortcuts
      .map((shortcut, index) => {
        const title = shortcut.title.toLocaleLowerCase();
        const host = hostOf(shortcut.url).toLocaleLowerCase();
        const url = shortcut.url.toLocaleLowerCase();
        const group = (groupNames.get(shortcut.groupId) || '').toLocaleLowerCase();
        let score = 0;
        if (title === needle || host === needle) score = 100;
        else if (title.startsWith(needle) || host.startsWith(needle)) score = 70;
        else if (title.includes(needle) || host.includes(needle)) score = 45;
        else if (url.includes(needle) || group.includes(needle)) score = 20;
        return { shortcut, score, index, groupTitle: groupNames.get(shortcut.groupId) || '' };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .slice(0, limit)
      .map(({ shortcut, groupTitle }) => ({ ...shortcut, groupTitle }));
  }

  findDuplicate(url, exceptId = '') {
    const key = canonicalUrl(url);
    if (!key) return null;
    return this.shortcuts.find(
      (shortcut) => shortcut.id !== exceptId && canonicalUrl(shortcut.url) === key,
    ) || null;
  }

  get pinnedOrigins() {
    return [...new Set(this.shortcuts.map((shortcut) => originOf(shortcut.url)).filter(Boolean))];
  }

  hasGroup(id) {
    return this.groups.some((group) => group.id === id);
  }
}

export function normalizeGroups(groups = []) {
  const result = [{ ...DEFAULT_GROUP }];
  const seen = new Set([DEFAULT_GROUP_ID]);
  for (const group of Array.isArray(groups) ? groups : []) {
    if (!group || typeof group.id !== 'string' || seen.has(group.id)) continue;
    const title = String(group.title || '').trim().slice(0, 20);
    if (!title) continue;
    result.push({ id: group.id, title, collapsed: Boolean(group.collapsed) });
    seen.add(group.id);
  }
  const legacyDefault = Array.isArray(groups)
    ? groups.find((group) => group?.id === DEFAULT_GROUP_ID)
    : null;
  if (legacyDefault) {
    result[0].title = String(legacyDefault.title || DEFAULT_GROUP.title).trim().slice(0, 20)
      || DEFAULT_GROUP.title;
    result[0].collapsed = Boolean(legacyDefault.collapsed);
  }
  return result;
}

export function canonicalUrl(value) {
  try {
    const url = new URL(value);
    url.hash = '';
    url.hostname = url.hostname.toLocaleLowerCase();
    if ((url.protocol === 'https:' && url.port === '443') || (url.protocol === 'http:' && url.port === '80')) {
      url.port = '';
    }
    if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/+$/, '');
    return url.href;
  } catch {
    return '';
  }
}

export function isNavigableUrl(value) {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

export function dedupeShortcuts(shortcuts = []) {
  const seen = new Set();
  const unique = [];
  const duplicates = [];
  for (const shortcut of shortcuts) {
    const key = canonicalUrl(shortcut.url);
    if (key && seen.has(key)) {
      duplicates.push(shortcut);
      continue;
    }
    if (key) seen.add(key);
    unique.push(shortcut);
  }
  return { shortcuts: unique, duplicates };
}

function hostOf(value) {
  try {
    return new URL(value).hostname;
  } catch {
    return '';
  }
}

function originOf(value) {
  try {
    return new URL(value).origin;
  } catch {
    return '';
  }
}

function createId(prefix) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
