// 自动推荐区：history 权限（可选）、频次评分、固定/屏蔽
// 数据获取走 chrome.history，评分逻辑在 shared/scorer.js

import { aggregateByOrigin, rankOrigins } from '../../shared/scorer.js';
import { makeIconEl } from '../../shared/favicon.js';
import { saveBlocked } from '../../shared/storage.js';

const WINDOW_DAYS = 30;
const TOP_N = 12;
const CANDIDATE_URLS = 60; // 初筛条数，逐条 getVisits 精确计算

export class Recommend {
  constructor(grid, hintEl, toggleBtn) {
    this.grid = grid;
    this.hintEl = hintEl;
    this.toggleBtn = toggleBtn;
    this.blocked = [];
    this.faviconSource = 'chrome';
    this.onPin = null; // 由 main 注入：固定到快捷区
    this.onEnable = null; // 由 main 注入：申请权限并保存设置
    this.onDisable = null; // 由 main 注入：设置里关闭
  }

  setState({ blocked, faviconSource, enabled }) {
    this.blocked = blocked;
    this.faviconSource = faviconSource;
    this.toggleBtn.textContent = enabled ? '暂停推荐' : '开启推荐';
    this.toggleBtn.onclick = () => (enabled ? this.onDisable?.() : this.onEnable?.());
    if (!enabled) {
      this.showHint('已暂停分析浏览记录。');
      this.grid.textContent = '';
      return;
    }
    this.refresh().catch((err) => this.showHint(`加载失败：${err.message}`));
  }

  async refresh() {
    const hasPerm = await chrome.permissions.contains({ permissions: ['history'] });
    if (!hasPerm) {
      this.showHint('浏览记录权限已关闭，请暂停后重新开启推荐。');
      return;
    }
    const sites = await fetchRankedSites({
      limit: TOP_N,
      windowDays: WINDOW_DAYS,
      blocked: this.blocked,
      pinnedOrigins: this.onPin ? this.pinnedOrigins : [],
    });
    this.render(sites);
  }

  get pinnedOrigins() {
    return this._pinnedOrigins || [];
  }
  setPinnedOrigins(origins) {
    this._pinnedOrigins = origins;
  }

  render(sites) {
    this.grid.textContent = '';
    if (!sites.length) {
      this.showHint('暂时没有可推荐的网站，浏览一段时间后再回来看看。');
      return;
    }
    this.hintEl.hidden = true;

    for (const site of sites) {
      const wrap = document.createElement('div');
      wrap.className = 'tile-wrap recommendation-tile';

      const a = document.createElement('a');
      a.className = 'tile';
      a.href = site.origin;
      a.title = `${site.title || site.host}\n${site.host} · ${site.visits} 次访问`;

      a.append(makeIconEl(site.origin, this.faviconSource, site.title || site.host));

      const name = document.createElement('span');
      name.className = 'tile-title';
      name.textContent = site.title || site.host;
      a.append(name);

      const sub = document.createElement('span');
      sub.className = 'tile-sub';
      sub.textContent = `${site.visits} 次访问`;
      a.append(sub);

      const actions = document.createElement('div');
      actions.className = 'tile-actions';

      const pinBtn = document.createElement('button');
      pinBtn.className = 'tile-action-btn';
      pinBtn.type = 'button';
      pinBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 3 8 0-1 6 3 3v2H6v-2l3-3-1-6ZM12 14v7"/></svg>';
      pinBtn.title = '固定到快捷方式';
      pinBtn.setAttribute('aria-label', `将 ${site.title || site.host} 固定到快捷方式`);
      pinBtn.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        pinBtn.disabled = true;
        try {
          await this.onPin?.(site);
        } finally {
          pinBtn.disabled = false;
        }
      };

      const blockBtn = document.createElement('button');
      blockBtn.className = 'tile-action-btn';
      blockBtn.type = 'button';
      blockBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
      blockBtn.title = `不再推荐 ${site.host}`;
      blockBtn.setAttribute('aria-label', `不再推荐 ${site.host}`);
      blockBtn.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!this.blocked.includes(site.origin)) this.blocked.push(site.origin);
        await saveBlocked(this.blocked);
        await this.refresh();
      };

      actions.append(pinBtn, blockBtn);
      wrap.append(a, actions);
      this.grid.append(wrap);
    }
  }

  showHint(text) {
    this.grid.textContent = '';
    this.hintEl.hidden = false;
    this.hintEl.textContent = text;
  }
}

// 拉取 + 评分：search 初筛 -> getVisits 精确到每次访问时间 -> 衰减评分
async function fetchRankedSites({ limit, windowDays, blocked, pinnedOrigins }) {
  const now = Date.now();
  const startTime = now - windowDays * 86400000;

  const items = await chrome.history.search({ text: '', startTime, maxResults: 2000 });
  const candidates = items
    .filter((i) => i.url?.startsWith('http'))
    .sort((a, b) => (b.lastVisitTime || 0) - (a.lastVisitTime || 0))
    .slice(0, CANDIDATE_URLS);

  const detailed = await Promise.all(
    candidates.map(async (c) => {
      const visits = await chrome.history.getVisits({ url: c.url });
      return {
        url: c.url,
        title: c.title,
        visitTimes: visits.map((v) => v.visitTime).filter((t) => t >= startTime),
      };
    }),
  );

  return rankOrigins(aggregateByOrigin(detailed), {
    now,
    limit,
    blocked,
    pinnedOrigins,
    windowDays,
    minVisits: 2,
  });
}
