// 在线图标候选：只访问固定图标服务，优先矢量与高清资源。

import { faviconUrl } from '../../shared/favicon.js';

const ICON_SIZE = 128;
const MIN_RASTER_SIZE = 64;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const REQUEST_TIMEOUT = 8000;

const BRAND_ALIASES = new Map([
  ['x.com', 'x'],
  ['twitter.com', 'x'],
  ['chatgpt.com', 'openai'],
  ['openai.com', 'openai'],
  ['youtu.be', 'youtube'],
  ['youtube.com', 'youtube'],
  ['notion.so', 'notion'],
  ['stackoverflow.com', 'stackoverflow'],
  ['weibo.com', 'sinaweibo'],
]);

export function makeOnlineIconSources(pageUrl, title = '') {
  const url = new URL(pageUrl);
  const host = url.hostname.replace(/^www\./, '');
  const brandSlugs = inferBrandSlugs(host, title);
  const brandVectors = brandSlugs.map((slug) => ({
    url: `https://cdn.simpleicons.org/${encodeURIComponent(slug)}`,
    label: '品牌矢量',
    kind: 'brand',
    background: '#f8fafc',
  }));
  const brandBadges = brandSlugs.map((slug) => ({
    url: `https://cdn.simpleicons.org/${encodeURIComponent(slug)}/fff`,
    label: '品牌徽标',
    kind: 'brand',
    background: '#111827',
  }));
  const brandCards = brandSlugs.map((slug) => ({
    url: `https://cdn.simpleicons.org/${encodeURIComponent(slug)}/fff`,
    label: '品牌卡片',
    kind: 'brand',
    background: '#4f6ef7',
  }));

  return [
    ...brandVectors,
    {
      url: `https://icon.horse/icon/${encodeURIComponent(host)}`,
      label: '高清网站图标',
      kind: 'provider',
    },
    ...brandBadges,
    ...brandCards,
    {
      url: faviconUrl(pageUrl, 'chrome', ICON_SIZE),
      label: '浏览器缓存',
      kind: 'browser',
    },
    {
      url: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${ICON_SIZE}`,
      label: 'Google',
      kind: 'provider',
    },
    {
      url: `https://icons.duckduckgo.com/ip3/${encodeURIComponent(host)}.ico`,
      label: 'DuckDuckGo',
      kind: 'provider',
    },
  ];
}

export async function findOnlineIcons(pageUrl, options = {}) {
  const normalizedOptions = typeof options === 'number' ? { limit: options } : options;
  const { title = '', limit = 3 } = normalizedOptions;
  const sources = makeOnlineIconSources(pageUrl, title);
  const loaded = await Promise.all(sources.map(loadCandidate));
  const candidates = [];
  const seenImages = new Set();

  for (const candidate of loaded) {
    if (!candidate || seenImages.has(candidate.dataUrl)) continue;
    seenImages.add(candidate.dataUrl);
    candidates.push(candidate);
    if (candidates.length === limit) break;
  }
  return candidates;
}

export function isSharpEnough({ width, height, vector }) {
  return Boolean(vector) || Math.min(width, height) >= MIN_RASTER_SIZE;
}

export function inferBrandSlugs(hostname, title = '') {
  const host = String(hostname).toLowerCase().replace(/^www\./, '');
  const alias = [...BRAND_ALIASES].find(([domain]) => host === domain || host.endsWith(`.${domain}`))?.[1];
  const domainLabel = host.split('.').at(-2) || host.split('.')[0];
  const titleSlug = slugify(title.replace(/\s*[-|·].*$/, ''));
  return [...new Set([alias, titleSlug, slugify(domainLabel)].filter(Boolean))].slice(0, 2);
}

async function loadCandidate(source) {
  try {
    const response = await fetchWithTimeout(source.url, {
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
    if (!response.ok) return null;
    const length = Number(response.headers.get('content-length') || 0);
    if (length > MAX_IMAGE_BYTES) return null;
    const blob = await response.blob();
    if (!blob.type.startsWith('image/') || blob.size > MAX_IMAGE_BYTES) return null;
    const converted = await blobToIconData(blob, source.background);
    if (!isSharpEnough(converted)) return null;
    return { ...source, ...converted };
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function slugify(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function blobToIconData(blob, background = '') {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(blob);
    const vector = /^image\/svg\+xml/i.test(blob.type);
    const cleanup = () => URL.revokeObjectURL(objectUrl);
    image.onload = () => {
      try {
        const width = image.naturalWidth || ICON_SIZE;
        const height = image.naturalHeight || ICON_SIZE;
        const canvasSize = vector
          ? ICON_SIZE
          : Math.min(ICON_SIZE, Math.max(1, Math.min(width, height)));
        const canvas = document.createElement('canvas');
        canvas.width = canvasSize;
        canvas.height = canvasSize;
        const context = canvas.getContext('2d');
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        if (background) {
          context.fillStyle = background;
          context.fillRect(0, 0, canvasSize, canvasSize);
        }
        const inset = background ? Math.round(canvasSize * 0.22) : 0;
        const available = canvasSize - inset * 2;
        const renderScale = Math.min(available / width, available / height);
        context.drawImage(
          image,
          (canvasSize - width * renderScale) / 2,
          (canvasSize - height * renderScale) / 2,
          width * renderScale,
          height * renderScale,
        );
        const png = canvas.toDataURL('image/png');
        const webp = canvas.toDataURL('image/webp', 0.92);
        resolve({
          dataUrl: webp.startsWith('data:image/webp') && webp.length < png.length ? webp : png,
          width,
          height,
          vector,
        });
      } catch (error) {
        reject(error);
      } finally {
        cleanup();
      }
    };
    image.onerror = () => {
      cleanup();
      reject(new Error('无法解析图标'));
    };
    image.src = objectUrl;
  });
}
