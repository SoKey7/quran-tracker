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

const BANNER_RULES = [
  { title: "Premiere lecture 📖", subtitle: "Tu as commence !", icon: "📖", test: (d, lues, streak) => lues === 1 },
  { title: "10 sourates lues 🌱", subtitle: "Continue !", icon: "🌱", test: (d, lues) => lues === 10 },
  { title: "50 sourates lues ⭐", subtitle: "Mi-parcours !", icon: "⭐", test: (d, lues) => lues === 50 },
  { title: "Coran termine 🏆", subtitle: "Prestige debloque !", icon: "🏆", test: (d, lues) => lues === 114 },
  { title: "3 jours de suite 🔥", subtitle: "Serie en cours !", icon: "🔥", test: (d, lues, streak) => streak === 3 },
  { title: "7 jours de suite 🔥🔥", subtitle: "Une semaine !", icon: "🔥", test: (d, lues, streak) => streak === 7 },
  { title: "30 jours 🏅", subtitle: "Un mois complet !", icon: "🏅", test: (d, lues, streak) => streak === 30 }
];

export function evaluateBadges(data, onUnlock) {
  if (!Array.isArray(data.badges.unlocked)) data.badges.unlocked = [];
  const lues = Array.isArray(data.progress?.readSurahs) ? data.progress.readSurahs.length : 0;
  const streak = Number(data.streak?.current || 0);

  BANNER_RULES.forEach((rule) => {
    if (rule.test(data, lues, streak) && onUnlock) onUnlock(rule.title, rule.subtitle, rule.icon);
  });

  BADGE_RULES.forEach((rule) => {
    const alreadyUnlocked = data.badges.unlocked.includes(rule.id);
    if (rule.test(data)) {
      if (!alreadyUnlocked) data.badges.unlocked.push(rule.id);
    }
  });

  if (!Array.isArray(data.badgesEarned)) data.badgesEarned = [];
  const permanent = data.badgesEarned;
  const toAdd = [];
  if (lues >= 1 && !permanent.includes("first")) toAdd.push("first");
  if (lues >= 10 && !permanent.includes("ten")) toAdd.push("ten");
  if (lues >= 50 && !permanent.includes("fifty")) toAdd.push("fifty");
  if (lues >= 114 && !permanent.includes("complete")) toAdd.push("complete");
  if (streak >= 7 && !permanent.includes("week")) toAdd.push("week");
  if (toAdd.length) {
    data.badgesEarned = [...permanent, ...toAdd];
  }
}

export function getBadgeCards(data) {
  const unlocked = Array.isArray(data.badges.unlocked) ? data.badges.unlocked : [];
  return BADGE_RULES.map((rule) => ({
    id: rule.id,
    title: rule.title,
    subtitle: rule.subtitle,
    icon: rule.icon,
    unlocked: unlocked.includes(rule.id)
  }));
}
