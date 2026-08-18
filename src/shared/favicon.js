// favicon 获取与降级链：图标源失败 -> 首字母彩色徽标

const BADGE_COLORS = [
  '#5b8def', '#9b7ede', '#e0719d', '#e8915a',
  '#5aa9a2', '#6fa860', '#c9a227', '#7a8499',
];

export function faviconUrl(pageUrl, source = 'chrome', size = 64) {
  const u = new URL(pageUrl);
  switch (source) {
    case 'google':
      return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=${size}`;
    case 'ddg':
      return `https://icons.duckduckgo.com/ip3/${u.hostname}.ico`;
    case 'chrome':
    default:
      return `chrome://favicon2/?size=${size}&scale_factor=1x&page_url=${encodeURIComponent(u.origin)}`;
  }
}

// 生成 <span class="tile-icon">，含 img 与降级徽标
export function makeIconEl(pageUrl, source, fallbackText) {
  const wrap = document.createElement('span');
  wrap.className = 'tile-icon';
  const text = (fallbackText || '').trim();
  const letter = text ? text[0].toUpperCase() : '?';

  const badge = document.createElement('span');
  badge.className = 'icon-badge';
  badge.textContent = letter;
  badge.style.background = badgeColor(pageUrl);
  badge.title = text;

  const img = document.createElement('img');
  img.className = 'icon-img';
  img.alt = '';
  img.loading = 'lazy';
  img.src = faviconUrl(pageUrl, source);
  img.addEventListener('error', () => img.remove());

  wrap.append(img, badge);
  return wrap;
}

function badgeColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return BADGE_COLORS[Math.abs(hash) % BADGE_COLORS.length];
}
