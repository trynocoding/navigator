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
    item.visitTimes.push(...(e.visitTimes || []));
    if (e.title) item.titles.set(e.title, (item.titles.get(e.title) || 0) + 1);
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
