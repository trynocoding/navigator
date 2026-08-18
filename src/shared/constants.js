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

export const DEFAULT_SETTINGS = {
  theme: 'auto',
  accent: '',
  engine: 'google',
  customEngine: 'https://example.com/search?q=%s',
  faviconSource: 'chrome',
  recommendEnabled: false,
  welcomeDismissed: false,
};
