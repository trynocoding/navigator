// 频次评分算法（纯函数，不依赖 chrome API）
// 思路：近 30 天访问记录按域名聚合，每次访问按时间衰减加权
//   weight = 1 / (1 + 距今天数 / 半衰期)，半衰期默认 7 天
// 近期常去权重高，很久前去的自然衰减

export const DAY_MS = 86400000;

export function originOf(url) {
  try {
    const u = new URL(url);
    return u.origin;
  } catch {
    return '';
  }
}

export function hostOfUrl(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/**
 * 从 history.search 的 URL 级结果中选择需要进一步调用 getVisits 的候选。
 * 同时保留高频 origin 与最近活跃 origin，并限制单个 origin 占用的 URL 数，
 * 避免“最近 60 个页面”被同一网站或大量低频页面挤满。
 */
export function selectHistoryCandidates(
  items,
  { maxOrigins = 60, maxUrlsPerOrigin = 2, frequencyShare = 0.7 } = {},
) {
  if (maxOrigins <= 0 || maxUrlsPerOrigin <= 0) return [];

  const uniqueUrls = new Map();
  for (const item of items) {
    const origin = originOf(item?.url);
    if (!origin || !/^https?:$/.test(new URL(item.url).protocol)) continue;
    const normalized = {
      ...item,
      origin,
      visitCount: Math.max(0, Number(item.visitCount) || 0),
      lastVisitTime: Math.max(0, Number(item.lastVisitTime) || 0),
    };
    const previous = uniqueUrls.get(item.url);
    if (!previous
      || normalized.visitCount > previous.visitCount
      || normalized.lastVisitTime > previous.lastVisitTime) {
      uniqueUrls.set(item.url, normalized);
    }
  }

  const origins = new Map();
  for (const item of uniqueUrls.values()) {
    let group = origins.get(item.origin);
    if (!group) {
      group = { origin: item.origin, estimatedVisits: 0, lastVisitTime: 0, urls: [] };
      origins.set(item.origin, group);
    }
    group.estimatedVisits += item.visitCount;
    group.lastVisitTime = Math.max(group.lastVisitTime, item.lastVisitTime);
    group.urls.push(item);
  }

  const groups = [...origins.values()];
  const byFrequency = [...groups].sort(
    (a, b) => b.estimatedVisits - a.estimatedVisits
      || b.lastVisitTime - a.lastVisitTime
      || a.origin.localeCompare(b.origin),
  );
  const byRecency = [...groups].sort(
    (a, b) => b.lastVisitTime - a.lastVisitTime
      || b.estimatedVisits - a.estimatedVisits
      || a.origin.localeCompare(b.origin),
  );

  const targetCount = Math.min(maxOrigins, groups.length);
  const frequencyCount = Math.min(
    targetCount,
    Math.max(0, Math.round(targetCount * Math.min(1, Math.max(0, frequencyShare)))),
  );
  const selected = byFrequency.slice(0, frequencyCount);
  const selectedOrigins = new Set(selected.map((group) => group.origin));
  for (const group of byRecency) {
    if (selected.length >= targetCount) break;
    if (!selectedOrigins.has(group.origin)) {
      selected.push(group);
      selectedOrigins.add(group.origin);
    }
  }

  return selected.flatMap((group) =>
    group.urls
      .sort(
        (a, b) => b.visitCount - a.visitCount
          || b.lastVisitTime - a.lastVisitTime
          || a.url.localeCompare(b.url),
      )
      .slice(0, maxUrlsPerOrigin),
  );
}

// url 级明细 -> origin 级聚合
export function aggregateByOrigin(entries) {
  const map = new Map();
  for (const e of entries) {
    const origin = originOf(e.url);
    if (!origin || !/^https?:$/.test(new URL(e.url).protocol)) continue;
    let item = map.get(origin);
    if (!item) {
      item = { origin, host: hostOfUrl(e.url), visitTimes: [], titles: new Map() };
      map.set(origin, item);
    }
    const visitTimes = e.visitTimes || [];
    item.visitTimes.push(...visitTimes);
    if (e.title) {
      const titleWeight = Math.max(1, visitTimes.length);
      item.titles.set(e.title, (item.titles.get(e.title) || 0) + titleWeight);
    }
  }
  return [...map.values()];
}

export function decayedScore(visitTimes, now = Date.now(), halfLifeDays = 7) {
  return visitTimes.reduce(
    (sum, t) => sum + 1 / (1 + Math.max(0, now - t) / (halfLifeDays * DAY_MS)),
    0,
  );
}

/**
 * 聚合结果 -> 排序后的推荐列表
 * blocked:     string[] 屏蔽的 origin
 * pinnedOrigins: string[] 已在快捷区的 origin（去重不展示）
 */
export function rankOrigins(aggregated, { now = Date.now(), limit = 12, blocked = [], pinnedOrigins = [], minVisits = 2, windowDays = 30 } = {}) {
  const blockedSet = new Set(blocked);
  const pinnedSet = new Set(pinnedOrigins);
  const windowStart = now - windowDays * DAY_MS;

  return aggregated
    .map((item) => {
      const times = item.visitTimes.filter((t) => t >= windowStart && t <= now);
      return {
        origin: item.origin,
        host: item.host,
        visits: times.length,
        lastVisit: times.length ? Math.max(...times) : 0,
        score: decayedScore(times, now),
        title: bestTitle(item.titles),
      };
    })
    .filter(
      (s) =>
        s.visits >= minVisits &&
        !blockedSet.has(s.origin) &&
        !pinnedSet.has(s.origin),
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function bestTitle(titles) {
  let best = '';
  let bestCount = 0;
  for (const [title, count] of titles) {
    // 站点名通常是出现最多的非空标题；跳过纯数字验证码类标题
    if (count > bestCount && title.trim().length >= 2 && !/^\d+$/.test(title)) {
      best = title;
      bestCount = count;
    }
  }
  return best;
}
