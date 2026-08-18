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
  let historyGranted = localStorage.getItem('navigator-dev-history') === '1';
  globalThis.chrome = {
    ...globalThis.chrome,
    storage: { sync: makeArea('sync'), local: makeArea('local') },
    permissions: {
      async contains({ permissions }) { return !permissions.includes('history') || historyGranted; },
      async request({ permissions }) {
        if (permissions.includes('history')) {
          historyGranted = true;
          localStorage.setItem('navigator-dev-history', '1');
        }
        return true;
      },
      async remove({ permissions }) {
        if (permissions.includes('history')) {
          historyGranted = false;
          localStorage.removeItem('navigator-dev-history');
        }
        return true;
      },
    },
    history: {
      async search() { return []; },
      async getVisits() { return []; },
    },
  };
}
