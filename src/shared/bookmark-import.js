// Chrome 书签树适配为 Navigator 可导入的扁平分组列表。

import { isNavigableUrl } from './shortcut-model.js';

export function flattenBookmarkTree(roots = []) {
  const folders = [];
  const invalid = [];

  const visit = (node, ancestors = []) => {
    const children = Array.isArray(node?.children) ? node.children : [];
    const title = String(node?.title || '').trim();
    const path = title ? [...ancestors, title] : ancestors;
    const bookmarks = [];

    for (const child of children) {
      if (child?.url) {
        const item = {
          id: String(child.id || `${node?.id || 'root'}-${bookmarks.length}`),
          title: String(child.title || '').trim() || safeHost(child.url) || child.url,
          url: child.url,
        };
        if (isNavigableUrl(item.url)) bookmarks.push(item);
        else invalid.push(item);
      }
    }

    if (bookmarks.length) {
      folders.push({
        id: String(node?.id || `folder-${folders.length}`),
        title: title || '未分类书签',
        path: path.join(' / ') || '未分类书签',
        bookmarks,
      });
    }
    for (const child of children) {
      if (!child?.url) visit(child, path);
    }
  };

  for (const root of Array.isArray(roots) ? roots : []) visit(root);
  return { folders, invalid };
}

export function selectBookmarkCandidates(folders, selectedFolderIds) {
  const selected = new Set(selectedFolderIds);
  return folders
    .filter((folder) => selected.has(folder.id))
    .flatMap((folder) => folder.bookmarks.map((bookmark) => ({ ...bookmark })));
}

function safeHost(url) {
  try { return new URL(url).hostname; } catch { return ''; }
}
