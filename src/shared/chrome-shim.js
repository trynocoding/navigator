// 本地开发适配：在普通浏览器预览中模拟扩展 API。
// Chrome 扩展环境已有这些 API 时不做任何改动。

if (!globalThis.chrome?.storage) {
  const makeArea = (name) => {
    const storageKey = `navigator-dev-${name}`;
    const read = () => {
      try { return JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { return {}; }
    };
    const write = (data) => localStorage.setItem(storageKey, JSON.stringify(data));
    return {
      async get(keys) {
        const data = read();
        if (keys === null) return structuredClone(data);
        if (typeof keys === 'object' && !Array.isArray(keys)) {
          return Object.fromEntries(Object.entries(keys).map(([key, fallback]) => [
            key,
            Object.hasOwn(data, key) ? structuredClone(data[key]) : fallback,
          ]));
        }
        const list = Array.isArray(keys) ? keys : [keys];
        return Object.fromEntries(list.filter((key) => Object.hasOwn(data, key)).map((key) => [key, structuredClone(data[key])]));
      },
      async set(entries) { write({ ...read(), ...structuredClone(entries) }); },
      async remove(keys) {
        const data = read();
        for (const key of Array.isArray(keys) ? keys : [keys]) delete data[key];
        write(data);
      },
    };
  };
  const grantedPermissions = new Set(JSON.parse(localStorage.getItem('navigator-dev-permissions') || '[]'));
  const migratedHistoryPermission = localStorage.getItem('navigator-dev-history') === '1';
  if (migratedHistoryPermission) {
    grantedPermissions.add('history');
    localStorage.removeItem('navigator-dev-history');
  }
  const persistPermissions = () => localStorage.setItem('navigator-dev-permissions', JSON.stringify([...grantedPermissions]));
  if (migratedHistoryPermission) persistPermissions();
  const demoNow = Date.now();
  const demoHistory = [
    { url: 'https://www.figma.com/files', title: 'Figma', visitCount: 5, lastVisitTime: demoNow - 2 * 3600000 },
    { url: 'https://www.notion.so/', title: 'Notion', visitCount: 3, lastVisitTime: demoNow - 86400000 },
  ];
  globalThis.chrome = {
    ...globalThis.chrome,
    storage: { sync: makeArea('sync'), local: makeArea('local') },
    permissions: {
      async contains({ permissions }) { return permissions.every((permission) => grantedPermissions.has(permission)); },
      async request({ permissions }) {
        permissions.forEach((permission) => grantedPermissions.add(permission));
        persistPermissions();
        return true;
      },
      async remove({ permissions }) {
        permissions.forEach((permission) => grantedPermissions.delete(permission));
        persistPermissions();
        return true;
      },
    },
    history: {
      async search() { return structuredClone(demoHistory); },
      async getVisits({ url }) {
        const item = demoHistory.find((entry) => entry.url === url);
        if (!item) return [];
        return Array.from({ length: item.visitCount }, (_, index) => ({
          visitTime: item.lastVisitTime - index * 86400000,
        }));
      },
    },
    tabs: {
      async query() {
        return [{ id: 1, title: 'Chrome Extensions 文档', url: 'https://developer.chrome.com/docs/extensions/' }];
      },
      async create({ url }) { window.open(url, '_blank', 'noopener'); },
    },
    bookmarks: {
      async getTree() {
        return [{ id: '0', title: '', children: [{ id: '1', title: '书签栏', children: [
          { id: 'a', title: 'Chrome Extensions', url: 'https://developer.chrome.com/docs/extensions/' },
          { id: 'b', title: 'GitHub', url: 'https://github.com/' },
          { id: '2', title: '工作', children: [{ id: 'c', title: 'MDN', url: 'https://developer.mozilla.org/' }] },
        ] }] }];
      },
    },
    runtime: {
      getURL(path) { return new URL(path, location.origin).href; },
    },
  };
}
