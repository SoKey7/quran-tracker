const BADGE_RULES = [
  { id: "first-read", title: "Premiere lecture", subtitle: "Bismillah, le voyage commence", icon: "🏆", test: (d) => d.profile.stats.totalSurahsValidated >= 1 },
  { id: "streak-3", title: "Serie 3 jours", subtitle: "Constance en progression", icon: "🔥", test: (d) => d.streak.max >= 3 },
  { id: "streak-7", title: "Serie 7 jours", subtitle: "Excellente discipline", icon: "🔥", test: (d) => d.streak.max >= 7 },
  { id: "streak-30", title: "Serie 30 jours", subtitle: "Niveau elite", icon: "💎", test: (d) => d.streak.max >= 30 },
  { id: "surah-10", title: "10 sourates lues", subtitle: "Beau cap franchi", icon: "📖", test: (d) => d.profile.stats.totalSurahsValidated >= 10 },
  { id: "first-long", title: "Premiere longue", subtitle: "Une sourate longue validee", icon: "🌟", test: (d) => d.badges.firstLongCompleted === true },
  { id: "prestige-1", title: "Prestige 1 atteint", subtitle: "Cycle complet termine", icon: "⭐", test: (d) => d.prestige >= 1 },
  { id: "prestige-2", title: "Prestige 2 atteint", subtitle: "Encore plus fort", icon: "⭐", test: (d) => d.prestige >= 2 },
  { id: "sessions-100", title: "100 lectures totales", subtitle: "Engagement exceptionnel", icon: "🏅", test: (d) => d.profile.stats.totalSessions >= 100 }
];

export function evaluateBadges(data, onUnlock) {
  if (!Array.isArray(data.badges.unlocked)) data.badges.unlocked = [];
  BADGE_RULES.forEach((rule) => {
    if (data.badges.unlocked.includes(rule.id)) return;
    if (rule.test(data)) {
      data.badges.unlocked.push(rule.id);
      if (onUnlock) onUnlock(rule.title, rule.subtitle, rule.icon);
    }
  });
}

export function getBadgeCards(data) {
  return BADGE_RULES.map((rule) => ({
    id: rule.id,
    title: rule.title,
    subtitle: rule.subtitle,
    icon: rule.icon,
    unlocked: data.badges.unlocked.includes(rule.id)
  }));
}
