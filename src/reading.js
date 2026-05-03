import { safeParse, TOTAL_SURAHS } from "./storage.js";
import { devLog } from "./utils.js";
import { surahs as surahsWeighted } from "./surahs.js";
import { SURAHS_DEFAULT } from "./reading-catalog-default.js";

export const CATEGORY_POINTS = { TresCourte: 1, Courte: 2, Moyenne: 5, Longue: 10 };

export function getSurahPoints(surah) {
  return CATEGORY_POINTS[surah?.categorie] ?? 1;
}

export function computeWeightedProgress(readSurahs, surahsList = surahsWeighted) {
  const readSet = new Set(readSurahs || []);
  const totalPoints = surahsList.reduce((sum, s) => sum + getSurahPoints(s), 0);
  const readPoints = surahsList.reduce((sum, s) => sum + (readSet.has(s.numero) ? getSurahPoints(s) : 0), 0);
  const percent = totalPoints ? Math.round((readPoints / totalPoints) * 100) : 0;
  return { readPoints, totalPoints, percent };
}

export function normalizeReadSurahIds(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.filter((id) => Number.isInteger(id) && id >= 1 && id <= TOTAL_SURAHS);
}

export function mergeReadSurahsIntoList(list, readSurahIds) {
  const readIds = new Set(normalizeReadSurahIds(readSurahIds));
  return list.map((s) =>
    readIds.has(Number(s.id)) ? { ...s, lu: true } : { ...s, lu: Boolean(s.lu) }
  );
}

function mapFormASourates(rows) {
  return rows.map((s) => ({
    id: Number(s.id || s.numero),
    numero: Number(s.numero),
    nomFrancais: s.nomFrancais || s.NomFrancais,
    categorie: s.categorie || s.Categorie,
    lu: s.lu === true || s.lu === "Oui" || s.lu === "oui"
  }));
}

function mapFormBSourates(rows) {
  return rows.map((s) => ({
    id: Number(s.Numero || s.numero),
    numero: Number(s.Numero || s.numero),
    nomFrancais: s.NomFrancais || s.nomFrancais,
    categorie: s.Categorie || s.categorie,
    lu: s.Lu === "Oui" || s.Lu === true || s.lu === true
  }));
}

function scanLocalStorageForSourates() {
  devLog("Scan localStorage pour catalogue sourates…");
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      const val = safeParse(localStorage.getItem(key), null);
      if (Array.isArray(val) && val.length > 50 && val[0] && (val[0].categorie || val[0].Categorie)) {
        devLog("Catalogue détecté (clé tableau):", key);
        return val.map((s) => ({
          id: Number(s.id || s.Numero || s.numero),
          numero: Number(s.Numero || s.numero || s.id),
          nomFrancais: s.NomFrancais || s.nomFrancais || s.nom,
          categorie: s.Categorie || s.categorie,
          lu: s.Lu === "Oui" || s.lu === true || s.Lu === true
        }));
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Catalogue sourates pour la génération (Forme A / B / migration / défaut).
 * @param {object|null} appData données applicatives déjà chargées (`state.data`).
 */
export function resolveSouratesCatalog(appData = null) {
  if (appData && Array.isArray(appData.sourates) && appData.sourates.length > 0) {
    devLog("Catalogue depuis appData.sourates:", appData.sourates.length);
    return mapFormASourates(appData.sourates);
  }

  const stored = safeParse(localStorage.getItem("quranTrackerData"), null);
  if (stored?.sourates?.length > 0) {
    devLog("Catalogue depuis quranTrackerData.sourates:", stored.sourates.length);
    return mapFormASourates(stored.sourates);
  }

  const formB = safeParse(localStorage.getItem("quranSourates"), null);
  if (Array.isArray(formB) && formB.length > 0) {
    devLog("Catalogue depuis quranSourates:", formB.length);
    return mapFormBSourates(formB);
  }

  const scanned = scanLocalStorageForSourates();
  if (scanned) return scanned;

  devLog("Catalogue par défaut (114 entrées projet)");
  return SURAHS_DEFAULT.map((s) => ({ ...s, lu: false }));
}

/** @param {object|null} appData */
export function generateReading(minutes, appData = null) {
  const POINTS = { ...CATEGORY_POINTS };
  const TARGETS = { 10: 5, 20: 10, 30: 15 };
  const target = TARGETS[minutes] ?? 5;
  const readIds = appData?.progress?.readSurahs;
  let allSourates = mergeReadSurahsIntoList(resolveSouratesCatalog(appData), readIds);

  const nonLues = allSourates.filter((s) => s.lu === false);
  if (!nonLues.length) {
    return { error: "all_read" };
  }

  const selection = [];
  let points = 0;
  let iterations = 0;
  const MAX_ITER = 200;

  while (points < target && iterations < MAX_ITER) {
    iterations += 1;
    const disponibles = nonLues.filter((s) => !selection.some((sel) => sel.id === s.id));
    if (!disponibles.length) break;

    const cats = [...new Set(disponibles.map((s) => s.categorie))];
    const catsFiltrees = cats.filter((c) => {
      const v = POINTS[c];
      return v !== undefined && points + v <= target + 2;
    });
    const catsFinales = catsFiltrees.length ? catsFiltrees : cats;
    const cat = catsFinales[Math.floor(Math.random() * catsFinales.length)];
    const valeur = POINTS[cat];
    if (valeur === undefined) continue;

    const candidates = disponibles.filter((s) => s.categorie === cat);
    if (!candidates.length) continue;

    const sourate = candidates[Math.floor(Math.random() * candidates.length)];
    selection.push(sourate);
    points += valeur;
  }

  return { selection, points };
}

export function displayReading(result) {
  let container = document.getElementById("reading-results") || document.getElementById("dailyReadingList");
  if (!container) return;

  if (result.error === "all_read") {
    container.innerHTML =
      `<li style="list-style:none;padding:12px;"><p>Toutes les sourates ont été lues 🎉</p><p>Lance un nouveau cycle depuis ton Profil.</p></li>`;
    container.style.display = "block";
    void container.offsetHeight;
    return;
  }

  container.innerHTML = "";
  result.selection.forEach((s) => {
    const wrap = document.createElement("li");
    wrap.style.listStyle = "none";
    const card = document.createElement("div");
    card.style.cssText =
      "padding:12px 16px;margin:8px 0;background:rgba(255,255,255,0.06);" +
      "border-radius:10px;border-left:3px solid #d4af37;color:white;" +
      "font-size:14px;display:flex;justify-content:space-between;align-items:center;";
    card.innerHTML = `<span>${s.numero} — ${s.nomFrancais}</span><span>${s.categorie}</span>`;
    wrap.appendChild(card);
    container.appendChild(wrap);
  });

  container.style.display = "block";
  void container.offsetHeight;
}
