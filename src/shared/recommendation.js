export const RECOMMEND_PROFILES = Object.freeze({
  stable: Object.freeze({
    id: 'stable',
    label: '更稳定',
    halfLifeDays: 14,
    minVisits: 3,
    frequencyShare: 0.8,
  }),
  sensitive: Object.freeze({
    id: 'sensitive',
    label: '更灵敏',
    halfLifeDays: 4,
    minVisits: 2,
    frequencyShare: 0.55,
  }),
});

export function resolveRecommendProfile(mode) {
  return RECOMMEND_PROFILES[mode] || RECOMMEND_PROFILES.stable;
}
