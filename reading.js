export const CATEGORY_POINTS = {
  TresCourte: 1,
  Courte: 2,
  Moyenne: 5,
  Longue: 10
};

export function getSurahPoints(surah) {
  return CATEGORY_POINTS[surah?.categorie] || 1;
}

export function computeWeightedProgress(readSurahs, surahs) {
  const readSet = new Set(readSurahs || []);
  const totalPoints = surahs.reduce((sum, s) => sum + getSurahPoints(s), 0);
  const readPoints = surahs.reduce((sum, s) => sum + (readSet.has(s.numero) ? getSurahPoints(s) : 0), 0);
  const percent = totalPoints ? Math.round((readPoints / totalPoints) * 100) : 0;
  return { readPoints, totalPoints, percent };
}

export function buildReadingPlan(unreadSurahs, minutes, logger = console) {
  const targetCount = { 10: 2, 20: 3, 30: 4 }[minutes] || 2;
  if (!Array.isArray(unreadSurahs) || !unreadSurahs.length) return [];
  const pools = {
    TresCourte: unreadSurahs.filter((s) => s.categorie === "TresCourte"),
    Courte: unreadSurahs.filter((s) => s.categorie === "Courte"),
    Moyenne: unreadSurahs.filter((s) => s.categorie === "Moyenne"),
    Longue: unreadSurahs.filter((s) => s.categorie === "Longue")
  };
  const order = ["Longue", "Moyenne", "Courte", "TresCourte"];
  const picked = [];
  const pickedIds = new Set();
  while (picked.length < targetCount) {
    let progressed = false;
    for (const cat of order) {
      if (picked.length >= targetCount) break;
      if (!pools[cat].length) continue;
      const idx = Math.floor(Math.random() * pools[cat].length);
      const candidate = pools[cat].splice(idx, 1)[0];
      if (!pickedIds.has(candidate.numero)) {
        picked.push(candidate);
        pickedIds.add(candidate.numero);
        progressed = true;
      }
    }
    if (!progressed) break;
  }
  logger.info("[reading] Plan generated", {
    minutes,
    unreadCount: unreadSurahs.length,
    picked: picked.map((s) => s.numero)
  });
  return picked;
}
