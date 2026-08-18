// 搜索引擎表、主题表、图标源表与默认配置

export const ENGINES = {
  google: { label: 'Google', url: 'https://www.google.com/search?q=%s' },
  bing: { label: 'Bing', url: 'https://www.bing.com/search?q=%s' },
  baidu: { label: '百度', url: 'https://www.baidu.com/s?wd=%s' },
  custom: { label: '自定义', url: '' },
};

export const THEMES = [
  { id: 'auto', label: '跟随系统' },
  { id: 'cloud', label: '云白' },
  { id: 'warmsand', label: '暖沙' },
  { id: 'graphite', label: '石墨' },
  { id: 'deepblue', label: '深空蓝' },
  { id: 'morandi', label: '莫兰迪绿' },
  { id: 'darkviolet', label: '暗紫' },
];

export const FAVICON_SOURCES = [
  { id: 'chrome', label: '浏览器缓存（推荐，离线可用）' },
  { id: 'google', label: 'Google 图标服务' },
  { id: 'ddg', label: 'DuckDuckGo 图标' },
];

export const PAGE_SCALE = {
  min: 80,
  max: 125,
  step: 5,
};

export const DEFAULT_SETTINGS = {
  theme: 'auto',
  accent: '',
  pageScale: 100,
  engine: 'google',
  customEngine: 'https://example.com/search?q=%s',
  faviconSource: 'chrome',
  recommendEnabled: false,
  recommendWindowDays: 30,
  recommendMode: 'stable',
  quickSaveGroupId: 'default',
  welcomeDismissed: false,
};

export function normalizePageScale(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_SETTINGS.pageScale;
  const stepped = Math.round(numeric / PAGE_SCALE.step) * PAGE_SCALE.step;
  return Math.min(PAGE_SCALE.max, Math.max(PAGE_SCALE.min, stepped));
}

export const RECOMMEND_WINDOWS = [
  { value: 7, label: '近 7 天' },
  { value: 30, label: '近 30 天' },
  { value: 90, label: '近 90 天' },
];

export const RECOMMEND_MODES = [
  { id: 'stable', label: '更稳定', description: '更看重持续访问，不容易频繁变化' },
  { id: 'sensitive', label: '更灵敏', description: '更快响应最近新增的访问习惯' },
];
