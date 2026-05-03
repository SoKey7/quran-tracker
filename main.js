import { clearAll, loadAppData, saveAppData, TOTAL_SURAHS, validateData } from "./storage.js";
import { addNote, deleteNote, updateNote } from "./notes.js";
import { evaluateBadges } from "./badges.js";
import { markSurahAsRead, markSurahAsUnread } from "./history.js";
import { computeWeightedProgress } from "./reading.js";
import { formatWeightedLabel } from "./profile.js";
import { getHomeWidgets } from "./widgets.js";
import { createFriendsService } from "./friends.js";
import { isFirebaseConfigured } from "./firebase-config.js";
import {
  watchAuth,
  signUp,
  signIn,
  syncUserStats,
  searchUsersByPseudoOrEmail,
  sendFriendRequest,
  getIncomingFriendRequests,
  respondToFriendRequest,
  getFriends
} from "./firebase-service.js";
import {
  closeNotesModal,
  openNotesModal,
  renderAllNotes,
  renderBadges,
  renderDailyReading,
  renderHistory,
  renderProfile,
  renderSearchResults,
  renderMonthlyHeatmap,
  renderSurahNotesList,
  renderTop,
  renderWidgets,
  renderFriends,
  renderProfileWidgets,
  renderFriendRequests,
  showHeatmapTooltip,
  showAchievementBanner,
  showSaveSuccess,
  showToast
} from "./ui.js";

const AYAH_COUNTS = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135, 112, 78, 118, 64,
  77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49,
  62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42,
  29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6
];
const SURAH_NAMES_FR = [
  "L'Ouverture", "La Vache", "La Famille d'Imran", "Les Femmes", "La Table Servie", "Les Bestiaux", "Les Murailles", "Le Butin", "Le Repentir", "Younous", "Houd", "Youssouf", "Le Tonnerre", "Abraham", "Al-Hijr", "Les Abeilles", "Le Voyage Nocturne", "La Caverne", "Marie", "Ta-Ha", "Les Prophètes", "Le Pèlerinage", "Les Croyants", "La Lumière", "Le Discernement", "Les Poètes", "Les Fourmis", "Le Récit", "L'Araignée", "Les Romains", "Luqman", "La Prosternation", "Les Coalisés", "Saba", "Le Créateur", "Ya-Sin", "Les Rangés", "Sad", "Les Groupes", "Le Pardonneur", "Les Versets Détaillés", "La Consultation", "L'Ornement", "La Fumée", "L'Agenouillée", "Les Dunes", "Muhammad", "La Victoire", "Les Appartements", "Qaf", "Qui Éparpillent", "Le Mont", "L'Étoile", "La Lune", "Le Tout Miséricordieux", "L'Événement", "Le Fer", "La Discussion", "Le Rassemblement", "L'Éprouvée", "Le Rang", "Le Vendredi", "Les Hypocrites", "La Grande Perte", "Le Divorce", "L'Interdiction", "La Royauté", "La Plume", "L'Inévitable", "Les Voies d'Ascension", "Noé", "Les Djinns", "L'Enveloppé", "Le Revêtu", "La Résurrection", "L'Homme", "Les Envoyés", "La Nouvelle", "Les Anges qui Arrachent", "Il s'est Renfrogné", "L'Obscurcissement", "La Fissure", "Les Fraudeurs", "La Déchirure", "Les Constellations", "L'Astre Nocturne", "Le Très-Haut", "L'Enveloppante", "L'Aube", "La Cité", "Le Soleil", "La Nuit", "Le Jour Montant", "L'Ouverture de la Poitrine", "Le Figuier", "L'Adhérence", "La Destinée", "La Preuve", "Le Séisme", "Les Coursiers", "Le Fracas", "La Course aux Richesses", "Le Temps", "Les Calomniateurs", "L'Éléphant", "Quraych", "L'Ustensile", "L'Abondance", "Les Mécréants", "Le Secours", "Les Fibres", "Le Monothéisme Pur", "L'Aube Naissante", "Les Hommes"
];

const surahs = Array.from({ length: TOTAL_SURAHS }, (_, i) => {
  const numero = i + 1;
  const ayahs = AYAH_COUNTS[i];
  let categorie = "Longue";
  if (ayahs <= 10) categorie = "TresCourte";
  else if (ayahs <= 40) categorie = "Courte";
  else if (ayahs <= 120) categorie = "Moyenne";
  return { numero, nomFr: SURAH_NAMES_FR[i], categorie };
});
const surahMap = new Map(surahs.map((s) => [s.numero, s]));
const QUOTES = [
  "La patience est une lumiere.",
  "Cherche la connaissance, du berceau jusqu'a la tombe.",
  "Les ames sont comme des armees rassemblees.",
  "Celui qui ne remercie pas les hommes ne remercie pas Dieu.",
  "L'encre du savant vaut mieux que le sang du martyr.",
  "Chaque verset lu adoucit le coeur.",
  "La constance vaut mieux qu'un grand elan sans suite.",
  "Lis avec sincerite, meme peu, mais chaque jour.",
  "La guidance vient avec l'effort et l'humilite.",
  "Le meilleur des actes est celui qui dure."
];

const state = {
  data: loadAppData(),
  currentPlan: [],
  query: "",
  activeView: "prier",
  activeNoteSurahId: null,
  activeEditNoteId: null,
  pendingMarkSurahId: null,
  pendingMarkDateChoice: "today",
  authUser: null,
  incomingRequests: []
};
let friendsService = null;

function persist() {
  state.data = saveAppData(state.data);
  showSaveSuccess();
}

function setRandomQuote() {
  const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  const el = document.getElementById("quoteText");
  if (el) el.textContent = quote;
}

function switchView(viewName) {
  state.activeView = viewName;
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  document.getElementById(`view-${viewName}`).classList.add("active");
  document.querySelectorAll(".nav-btn").forEach((n) => n.classList.toggle("active", n.dataset.view === viewName));
  document.getElementById("pageTitleText").textContent = document.getElementById(`view-${viewName}`).dataset.title || "Quran Tracker";
  if (viewName === "profil") refreshWidgets();
  render();
}

function refreshWidgets() {
  const weighted = computeWeightedProgress(state.data.progress.readSurahs, surahs);
  renderProfileWidgets(state.data, weighted, {
    onStartReading() {
      switchView("prier");
    }
  });
}

function updateStreak(isoDate) {
  const day = isoDate.slice(0, 10);
  const prev = state.data.streak.lastDate;
  if (!prev) state.data.streak.current = 1;
  else if (prev !== day) {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yesterday = y.toISOString().slice(0, 10);
    state.data.streak.current = prev === yesterday ? state.data.streak.current + 1 : 1;
  }
  state.data.streak.lastDate = day;
  state.data.streak.max = Math.max(state.data.streak.max, state.data.streak.current);
}

function maybePrestige() {
  if (state.data.progress.readCount < TOTAL_SURAHS) return false;
  state.data.prestige += 1;
  state.data.progress.cyclesCompleted += 1;
  state.data.progress.readSurahs = [];
  state.data.progress.readCount = 0;
  showAchievementBanner(`Prestige ${state.data.prestige} atteint`, "Cycle complet valide", "⭐");
  return true;
}

function getSelectedMinutes() {
  const selected = document.querySelector(".time-btn.active");
  return Number(selected?.dataset.minutes || 10);
}

/** Liste des 114 sourates — fallback si aucune donnée localStorage (spec utilisateur). */
const SURAHS_DEFAULT = [
  { id: 1, numero: 1, nomFrancais: "L'Ouverture", categorie: "TresCourte" },
  { id: 2, numero: 2, nomFrancais: "La Vache", categorie: "Longue" },
  { id: 3, numero: 3, nomFrancais: "La Famille d'Imrân", categorie: "Longue" },
  { id: 4, numero: 4, nomFrancais: "Les Femmes", categorie: "Longue" },
  { id: 5, numero: 5, nomFrancais: "La Table Servie", categorie: "Longue" },
  { id: 6, numero: 6, nomFrancais: "Les Bestiaux", categorie: "Longue" },
  { id: 7, numero: 7, nomFrancais: "Les Murailles", categorie: "Longue" },
  { id: 8, numero: 8, nomFrancais: "Le Butin", categorie: "Moyenne" },
  { id: 9, numero: 9, nomFrancais: "Le Repentir", categorie: "Longue" },
  { id: 10, numero: 10, nomFrancais: "Jonas", categorie: "Moyenne" },
  { id: 11, numero: 11, nomFrancais: "Houd", categorie: "Moyenne" },
  { id: 12, numero: 12, nomFrancais: "Joseph", categorie: "Moyenne" },
  { id: 13, numero: 13, nomFrancais: "Le Tonnerre", categorie: "Courte" },
  { id: 14, numero: 14, nomFrancais: "Abraham", categorie: "Courte" },
  { id: 15, numero: 15, nomFrancais: "Al-Hijr", categorie: "Courte" },
  { id: 16, numero: 16, nomFrancais: "Les Abeilles", categorie: "Moyenne" },
  { id: 17, numero: 17, nomFrancais: "Le Voyage Nocturne", categorie: "Moyenne" },
  { id: 18, numero: 18, nomFrancais: "La Caverne", categorie: "Moyenne" },
  { id: 19, numero: 19, nomFrancais: "Marie", categorie: "Courte" },
  { id: 20, numero: 20, nomFrancais: "Tâ-Hâ", categorie: "Courte" },
  { id: 21, numero: 21, nomFrancais: "Les Prophètes", categorie: "Courte" },
  { id: 22, numero: 22, nomFrancais: "Le Pèlerinage", categorie: "Courte" },
  { id: 23, numero: 23, nomFrancais: "Les Croyants", categorie: "Courte" },
  { id: 24, numero: 24, nomFrancais: "La Lumière", categorie: "Courte" },
  { id: 25, numero: 25, nomFrancais: "Le Discernement", categorie: "Courte" },
  { id: 26, numero: 26, nomFrancais: "Les Poètes", categorie: "Courte" },
  { id: 27, numero: 27, nomFrancais: "Les Fourmis", categorie: "Courte" },
  { id: 28, numero: 28, nomFrancais: "Le Récit", categorie: "Courte" },
  { id: 29, numero: 29, nomFrancais: "L'Araignée", categorie: "Courte" },
  { id: 30, numero: 30, nomFrancais: "Les Romains", categorie: "Courte" },
  { id: 31, numero: 31, nomFrancais: "Luqmân", categorie: "TresCourte" },
  { id: 32, numero: 32, nomFrancais: "La Prosternation", categorie: "TresCourte" },
  { id: 33, numero: 33, nomFrancais: "Les Coalisés", categorie: "Courte" },
  { id: 34, numero: 34, nomFrancais: "Sabâ", categorie: "Courte" },
  { id: 35, numero: 35, nomFrancais: "Le Créateur", categorie: "TresCourte" },
  { id: 36, numero: 36, nomFrancais: "Yâ-Sîn", categorie: "Courte" },
  { id: 37, numero: 37, nomFrancais: "Les Rangés", categorie: "Courte" },
  { id: 38, numero: 38, nomFrancais: "Sâd", categorie: "Courte" },
  { id: 39, numero: 39, nomFrancais: "Les Groupes", categorie: "Courte" },
  { id: 40, numero: 40, nomFrancais: "Le Pardonneur", categorie: "Courte" },
  { id: 41, numero: 41, nomFrancais: "Expliquées en détail", categorie: "Courte" },
  { id: 42, numero: 42, nomFrancais: "La Consultation", categorie: "Courte" },
  { id: 43, numero: 43, nomFrancais: "L'Ornement", categorie: "Courte" },
  { id: 44, numero: 44, nomFrancais: "La Fumée", categorie: "TresCourte" },
  { id: 45, numero: 45, nomFrancais: "L'Agenouillée", categorie: "TresCourte" },
  { id: 46, numero: 46, nomFrancais: "Les Dunes", categorie: "TresCourte" },
  { id: 47, numero: 47, nomFrancais: "Muhammad", categorie: "TresCourte" },
  { id: 48, numero: 48, nomFrancais: "La Victoire", categorie: "TresCourte" },
  { id: 49, numero: 49, nomFrancais: "Les Appartements", categorie: "TresCourte" },
  { id: 50, numero: 50, nomFrancais: "Qâf", categorie: "TresCourte" },
  { id: 51, numero: 51, nomFrancais: "Les Vents Dispersants", categorie: "TresCourte" },
  { id: 52, numero: 52, nomFrancais: "La Montagne", categorie: "TresCourte" },
  { id: 53, numero: 53, nomFrancais: "L'Étoile", categorie: "TresCourte" },
  { id: 54, numero: 54, nomFrancais: "La Lune", categorie: "TresCourte" },
  { id: 55, numero: 55, nomFrancais: "Le Tout Miséricordieux", categorie: "TresCourte" },
  { id: 56, numero: 56, nomFrancais: "L'Événement", categorie: "TresCourte" },
  { id: 57, numero: 57, nomFrancais: "Le Fer", categorie: "TresCourte" },
  { id: 58, numero: 58, nomFrancais: "La Disputante", categorie: "TresCourte" },
  { id: 59, numero: 59, nomFrancais: "L'Exode", categorie: "TresCourte" },
  { id: 60, numero: 60, nomFrancais: "L'Éprouvée", categorie: "TresCourte" },
  { id: 61, numero: 61, nomFrancais: "Les Rangs", categorie: "TresCourte" },
  { id: 62, numero: 62, nomFrancais: "Le Vendredi", categorie: "TresCourte" },
  { id: 63, numero: 63, nomFrancais: "Les Hypocrites", categorie: "TresCourte" },
  { id: 64, numero: 64, nomFrancais: "La Privation", categorie: "TresCourte" },
  { id: 65, numero: 65, nomFrancais: "Le Divorce", categorie: "TresCourte" },
  { id: 66, numero: 66, nomFrancais: "L'Interdiction", categorie: "TresCourte" },
  { id: 67, numero: 67, nomFrancais: "La Royauté", categorie: "TresCourte" },
  { id: 68, numero: 68, nomFrancais: "La Plume", categorie: "TresCourte" },
  { id: 69, numero: 69, nomFrancais: "La Vérité", categorie: "TresCourte" },
  { id: 70, numero: 70, nomFrancais: "Les Voies d'Ascension", categorie: "TresCourte" },
  { id: 71, numero: 71, nomFrancais: "Noé", categorie: "TresCourte" },
  { id: 72, numero: 72, nomFrancais: "Les Djinns", categorie: "TresCourte" },
  { id: 73, numero: 73, nomFrancais: "L'Enveloppé", categorie: "TresCourte" },
  { id: 74, numero: 74, nomFrancais: "Le Revêtu", categorie: "TresCourte" },
  { id: 75, numero: 75, nomFrancais: "La Résurrection", categorie: "TresCourte" },
  { id: 76, numero: 76, nomFrancais: "L'Homme", categorie: "TresCourte" },
  { id: 77, numero: 77, nomFrancais: "Les Envoyés", categorie: "TresCourte" },
  { id: 78, numero: 78, nomFrancais: "La Nouvelle", categorie: "TresCourte" },
  { id: 79, numero: 79, nomFrancais: "Ceux qui arrachent", categorie: "TresCourte" },
  { id: 80, numero: 80, nomFrancais: "Il a froncé", categorie: "TresCourte" },
  { id: 81, numero: 81, nomFrancais: "L'Enroulement", categorie: "TresCourte" },
  { id: 82, numero: 82, nomFrancais: "L'Éclatement", categorie: "TresCourte" },
  { id: 83, numero: 83, nomFrancais: "Les Fraudeurs", categorie: "TresCourte" },
  { id: 84, numero: 84, nomFrancais: "Le Déchirement", categorie: "TresCourte" },
  { id: 85, numero: 85, nomFrancais: "Les Constellations", categorie: "TresCourte" },
  { id: 86, numero: 86, nomFrancais: "L'Astre Nocturne", categorie: "TresCourte" },
  { id: 87, numero: 87, nomFrancais: "Le Très-Haut", categorie: "TresCourte" },
  { id: 88, numero: 88, nomFrancais: "L'Envahissante", categorie: "TresCourte" },
  { id: 89, numero: 89, nomFrancais: "L'Aurore", categorie: "TresCourte" },
  { id: 90, numero: 90, nomFrancais: "La Cité", categorie: "TresCourte" },
  { id: 91, numero: 91, nomFrancais: "Le Soleil", categorie: "TresCourte" },
  { id: 92, numero: 92, nomFrancais: "La Nuit", categorie: "TresCourte" },
  { id: 93, numero: 93, nomFrancais: "La Matinée", categorie: "TresCourte" },
  { id: 94, numero: 94, nomFrancais: "L'Ouverture du Cœur", categorie: "TresCourte" },
  { id: 95, numero: 95, nomFrancais: "Le Figuier", categorie: "TresCourte" },
  { id: 96, numero: 96, nomFrancais: "L'Adhérence", categorie: "TresCourte" },
  { id: 97, numero: 97, nomFrancais: "La Nuit du Destin", categorie: "TresCourte" },
  { id: 98, numero: 98, nomFrancais: "La Preuve", categorie: "TresCourte" },
  { id: 99, numero: 99, nomFrancais: "Le Séisme", categorie: "TresCourte" },
  { id: 100, numero: 100, nomFrancais: "Les Coursiers", categorie: "TresCourte" },
  { id: 101, numero: 101, nomFrancais: "Le Fracas", categorie: "TresCourte" },
  { id: 102, numero: 102, nomFrancais: "La Course aux Richesses", categorie: "TresCourte" },
  { id: 103, numero: 103, nomFrancais: "Le Temps", categorie: "TresCourte" },
  { id: 104, numero: 104, nomFrancais: "Le Calomniateur", categorie: "TresCourte" },
  { id: 105, numero: 105, nomFrancais: "L'Éléphant", categorie: "TresCourte" },
  { id: 106, numero: 106, nomFrancais: "Qoraïch", categorie: "TresCourte" },
  { id: 107, numero: 107, nomFrancais: "L'Ustensile", categorie: "TresCourte" },
  { id: 108, numero: 108, nomFrancais: "L'Abondance", categorie: "TresCourte" },
  { id: 109, numero: 109, nomFrancais: "Les Infidèles", categorie: "TresCourte" },
  { id: 110, numero: 110, nomFrancais: "Le Secours", categorie: "TresCourte" },
  { id: 111, numero: 111, nomFrancais: "Les Fibres", categorie: "TresCourte" },
  { id: 112, numero: 112, nomFrancais: "Le Monothéisme Pur", categorie: "TresCourte" },
  { id: 113, numero: 113, nomFrancais: "L'Aube Naissante", categorie: "TresCourte" },
  { id: 114, numero: 114, nomFrancais: "Les Hommes", categorie: "TresCourte" }
];

function mergeReadSurahsIntoList(list) {
  let readIds = new Set();
  try {
    const data = JSON.parse(localStorage.getItem("quranTrackerData") || "{}");
    readIds = new Set(normalizeReadIds(data?.progress?.readSurahs));
  } catch {
    readIds = new Set(normalizeReadIds(state?.data?.progress?.readSurahs));
  }
  return list.map((s) =>
    readIds.has(Number(s.id))
      ? { ...s, lu: true }
      : { ...s, lu: Boolean(s.lu) }
  );
}

function normalizeReadIds(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.filter((id) => Number.isInteger(id) && id >= 1 && id <= TOTAL_SURAHS);
}

/** Spec : détection forme A / B / scan + fallback SURAHS_DEFAULT */
function getSourates() {
  try {
    const data = JSON.parse(localStorage.getItem("quranTrackerData"));
    if (data && data.sourates && data.sourates.length > 0) {
      console.log("[DATA] Forme A détectée, sourates:", data.sourates.length);
      return data.sourates.map((s) => ({
        id: s.id || s.numero,
        numero: s.numero,
        nomFrancais: s.nomFrancais || s.NomFrancais,
        categorie: s.categorie || s.Categorie,
        lu: s.lu === true || s.lu === "Oui" || s.lu === "oui"
      }));
    }
  } catch (e) {
    console.log("[DATA] Forme A échouée:", e);
  }

  try {
    const data = JSON.parse(localStorage.getItem("quranSourates"));
    if (data && data.length > 0) {
      console.log("[DATA] Forme B détectée, sourates:", data.length);
      return data.map((s) => ({
        id: s.Numero || s.numero,
        numero: s.Numero || s.numero,
        nomFrancais: s.NomFrancais || s.nomFrancais,
        categorie: s.Categorie || s.categorie,
        lu: s.Lu === "Oui" || s.Lu === true || s.lu === true
      }));
    }
  } catch (e) {
    console.log("[DATA] Forme B échouée:", e);
  }

  console.log("[DATA] Scan de toutes les clés localStorage...");
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    try {
      const val = JSON.parse(localStorage.getItem(key));
      if (Array.isArray(val) && val.length > 50) {
        console.log("[DATA] Tableau trouvé dans clé:", key, "longueur:", val.length);
        if (val[0] && (val[0].categorie || val[0].Categorie)) {
          console.log("[DATA] Semble être les sourates!");
          return val.map((s) => ({
            id: s.id || s.Numero || s.numero,
            numero: s.Numero || s.numero || s.id,
            nomFrancais: s.NomFrancais || s.nomFrancais || s.nom,
            categorie: s.Categorie || s.categorie,
            lu: s.Lu === "Oui" || s.lu === true || s.Lu === true
          }));
        }
      }
      if (val && typeof val === "object" && !Array.isArray(val)) {
        for (const k of Object.keys(val)) {
          if (Array.isArray(val[k]) && val[k].length > 50) {
            console.log("[DATA] Tableau dans objet clé:", key, "sous-clé:", k);
          }
        }
      }
    } catch (_) {
      /* ignore */
    }
  }

  console.log("[DATA] Aucune donnée, utilisation liste hardcodée");
  let base = SURAHS_DEFAULT.map((s) => ({ ...s, lu: false }));
  base = mergeReadSurahsIntoList(base);
  return base;
}

function generateReading(minutes) {
  const POINTS = { TresCourte: 1, Courte: 2, Moyenne: 5, Longue: 10 };
  const TARGETS = { 10: 5, 20: 10, 30: 15 };
  const target = TARGETS[minutes] || 5;
  console.log("[GEN] Démarrage. Objectif pts:", target);

  const allSourates = mergeReadSurahsIntoList(getSourates());
  console.log("[GEN] Total sourates chargées:", allSourates.length);
  console.log("[GEN] Données chargées:", allSourates.length >= 114 ? "OK" : "VIDE");

  const nonLues = allSourates.filter((s) => s.lu === false);
  console.log("[GEN] Non lues:", nonLues.length);

  if (nonLues.length === 0) {
    return { error: "all_read" };
  }

  const selection = [];
  let points = 0;
  let iterations = 0;
  const MAX_ITER = 200;

  while (points < target && iterations < MAX_ITER) {
    iterations += 1;

    const disponibles = nonLues.filter((s) => !selection.some((sel) => sel.id === s.id));

    if (disponibles.length === 0) break;

    const cats = [...new Set(disponibles.map((s) => s.categorie))];

    const catsFiltrees = cats.filter((c) => {
      const v = POINTS[c];
      if (v === undefined) return false;
      return points + v <= target + 2;
    });

    const catsFinales = catsFiltrees.length > 0 ? catsFiltrees : cats;

    const cat = catsFinales[Math.floor(Math.random() * catsFinales.length)];
    const valeur = POINTS[cat];
    if (valeur === undefined) continue;

    const candidates = disponibles.filter((s) => s.categorie === cat);
    if (candidates.length === 0) continue;

    const sourate = candidates[Math.floor(Math.random() * candidates.length)];

    selection.push(sourate);
    points += valeur;

    console.log("[GEN] Ajout:", sourate.nomFrancais, "| pts:", points, "/", target);
  }

  console.log("[GEN] Résultat final:", selection.length, "sourates,", points, "pts");
  console.log("[GEN] Sélection résultat:", selection);
  console.log("[GEN] Points finaux:", points);
  return { selection, points };
}

/** Affichage : #reading-results si présent, sinon #dailyReadingList (liste Prier). */
function displayReading(result) {
  let container = document.getElementById("reading-results");
  if (!container) {
    container = document.getElementById("dailyReadingList");
  }
  if (!container) {
    console.error("[DISPLAY] Élément reading-results introuvable dans le DOM");
    return;
  }

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
    card.innerHTML =
      `<span>${s.numero} — ${s.nomFrancais}</span><span>${s.categorie}</span>`;
    wrap.appendChild(card);
    container.appendChild(wrap);
  });

  container.style.display = "block";
  void container.offsetHeight;
}

function generateDailyReading() {
  const list = document.getElementById("dailyReadingList");
  if (!list) return;
  list.innerHTML = '<li class="skeleton-line"></li><li class="skeleton-line"></li>';

  const minutes = getSelectedMinutes();
  console.log("[BTN] Clic générer. Minutes:", minutes);

  const result = generateReading(minutes);
  displayReading(result);

  state.currentPlan = (result.selection || []).map((s) => ({
    numero: Number(s.numero),
    nomFr: s.nomFrancais,
    categorie: s.categorie
  }));

  const completeBtn = document.getElementById("completeBtn");
  if (completeBtn) {
    completeBtn.disabled = !(result.selection && result.selection.length > 0);
  }

  if (result.error !== "all_read") {
    showToast("Lecture du jour generee.");
  }
}

function completeDailyReading() {
  if (!state.currentPlan.length) return;
  const iso = new Date().toISOString();
  let validated = 0;
  state.currentPlan.forEach((surah) => {
    const already = state.data.progress.readSurahs.includes(surah.numero);
    markSurahAsRead(state.data, surah.numero, surah.nomFr, iso);
    if (!already) validated += 1;
    if (surah.categorie === "Longue") state.data.badges.firstLongCompleted = true;
    if (Array.isArray(state.data.sourates)) {
      const target = state.data.sourates.find((s) => Number(s.id || s.numero) === surah.numero);
      if (target) {
        target.lu = true;
        target.date = iso.slice(0, 10);
      }
    }
  });
  state.data.profile.stats.totalSessions += 1;
  state.data.profile.stats.totalMinutes += getSelectedMinutes();
  state.data.profile.stats.totalSurahsValidated += validated;
  updateStreak(iso);
  const prestige = maybePrestige();
  evaluateBadges(state.data, showAchievementBanner);
  if (state.data.settings.vibration && navigator.vibrate) navigator.vibrate([30, 15, 60]);
  if (state.data.settings.sound) playSuccessSound();
  if (state.data.settings.animations && prestige) launchConfetti(160);
  state.currentPlan = [];
  persist();
  render();
}

function toggleSurahRead(id) {
  const surah = surahMap.get(id);
  if (state.data.progress.readSurahs.includes(id)) {
    showConfirm("Retirer cette sourate de la progression ?").then(async (ok) => {
      if (!ok) return;
      const iso = new Date().toISOString();
      markSurahAsUnread(state.data, id, surah.nomFr, iso);
      if (Array.isArray(state.data.sourates)) {
        const target = state.data.sourates.find((s) => Number(s.id || s.numero) === id);
        if (target) {
          target.lu = false;
          target.date = null;
        }
      }
      updateStreak(iso);
      maybePrestige();
      evaluateBadges(state.data, showAchievementBanner);
      persist();
      render();
    });
    return;
  }
  openMarkDateModal(id);
}

function openNoteModal(surahId) {
  state.activeNoteSurahId = surahId;
  state.activeEditNoteId = null;
  openNotesModal(surahMap.get(surahId), state.data, noteHandlers());
  document.getElementById("noteCharCount").textContent = "0";
  renderSurahNotesList(state.data, state.activeNoteSurahId, noteHandlers());
}

function noteHandlers() {
  return {
    onEdit(note) {
      state.activeEditNoteId = note.id;
      document.getElementById("noteInput").value = note.text;
      document.getElementById("noteCharCount").textContent = String(note.text.length);
      document.getElementById("noteFavoriteToggle").checked = !!note.favorite;
    },
    onDelete(noteId) {
      showConfirm("Supprimer cette note ?").then(async (ok) => {
        if (!ok) return;
        deleteNote(state.data, state.activeNoteSurahId, noteId);
        persist();
        openNoteModal(state.activeNoteSurahId);
      });
    }
  };
}

function saveCurrentNote() {
  if (!state.activeNoteSurahId) return;
  const text = document.getElementById("noteInput").value.trim();
  const favorite = document.getElementById("noteFavoriteToggle").checked;
  if (!text) return showToast("Ecris une note avant d'enregistrer.");
  if (text.length > 2000) return showToast("Maximum 2000 caracteres.");
  if (state.activeEditNoteId) {
    updateNote(state.data, state.activeNoteSurahId, state.activeEditNoteId, text, favorite);
    state.activeEditNoteId = null;
  } else {
    addNote(state.data, state.activeNoteSurahId, text, favorite);
  }
  document.getElementById("noteInput").value = "";
  document.getElementById("noteCharCount").textContent = "0";
  document.getElementById("noteFavoriteToggle").checked = false;
  persist();
  openNoteModal(state.activeNoteSurahId);
}

function openMarkDateModal(surahId) {
  state.pendingMarkSurahId = surahId;
  const surah = surahMap.get(surahId);
  document.getElementById("markDateModalSurah").textContent = `${surahId}. ${surah?.nomFr || ""}`;
  state.pendingMarkDateChoice = "today";
  const custom = document.getElementById("markCustomDateInput");
  if (custom) custom.value = new Date().toISOString().slice(0, 10);
  document.getElementById("markCustomDateWrap")?.classList.add("hidden");
  document.getElementById("markTodayBtn")?.classList.add("active");
  document.getElementById("markYesterdayBtn")?.classList.remove("active");
  document.getElementById("markCustomBtn")?.classList.remove("active");
  const modal = document.getElementById("markDateModal");
  modal.classList.remove("hidden");
  modal.style.display = "grid";
  modal.style.opacity = "0";
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      modal.style.opacity = "1";
      modal.style.transition = "opacity 0.2s ease";
    });
  });
}

function closeMarkDateModal() {
  state.pendingMarkSurahId = null;
  const modal = document.getElementById("markDateModal");
  modal.style.opacity = "0";
  setTimeout(() => {
    modal.classList.add("hidden");
    modal.style.display = "";
  }, 180);
}

function resolveMarkDate() {
  const choice = state.pendingMarkDateChoice || "today";
  const now = new Date();
  if (choice === "today") return now;
  if (choice === "yesterday") {
    now.setDate(now.getDate() - 1);
    return now;
  }
  const custom = document.getElementById("markCustomDateInput")?.value;
  const customDate = custom ? new Date(`${custom}T12:00:00`) : now;
  return Number.isNaN(customDate.getTime()) ? now : customDate;
}

function confirmMarkDate() {
  const surahId = state.pendingMarkSurahId;
  if (!surahId) return;
  const surah = surahMap.get(surahId);
  const iso = resolveMarkDate().toISOString();
  markSurahAsRead(state.data, surahId, surah.nomFr, iso);
  state.data.progress.surahMeta = state.data.progress.surahMeta && typeof state.data.progress.surahMeta === "object" ? state.data.progress.surahMeta : {};
  state.data.progress.surahMeta[String(surahId)] = { date: iso };
  if (Array.isArray(state.data.sourates)) {
    const target = state.data.sourates.find((s) => Number(s.id || s.numero) === surahId);
    if (target) {
      target.lu = true;
      target.date = iso.slice(0, 10);
    }
  }
  state.data.profile.stats.totalSurahsValidated += 1;
  if (surah.categorie === "Longue") state.data.badges.firstLongCompleted = true;
  updateStreak(iso);
  maybePrestige();
  evaluateBadges(state.data, showAchievementBanner);
  persist();
  closeMarkDateModal();
  render();
}

function showConfirm(text) {
  const modal = document.getElementById("confirmModal");
  const textEl = document.getElementById("confirmModalText");
  const okBtn = document.getElementById("confirmOkBtn");
  const cancelBtn = document.getElementById("confirmCancelBtn");
  textEl.textContent = text || "Es-tu sur ?";
  modal.classList.remove("hidden");
  return new Promise((resolve) => {
    const close = () => modal.classList.add("hidden");
    const okHandler = () => {
      close();
      okBtn.removeEventListener("click", okHandler);
      cancelBtn.removeEventListener("click", cancelHandler);
      resolve(true);
    };
    const cancelHandler = () => {
      close();
      okBtn.removeEventListener("click", okHandler);
      cancelBtn.removeEventListener("click", cancelHandler);
      resolve(false);
    };
    okBtn.addEventListener("click", okHandler);
    cancelBtn.addEventListener("click", cancelHandler);
  });
}

function render() {
  const weighted = computeWeightedProgress(state.data.progress.readSurahs, surahs);
  renderTop(state.data, TOTAL_SURAHS, weighted);
  renderSearchResults(state.data, surahs, state.query, { onToggleRead: toggleSurahRead, onNote: openNoteModal });
  renderDailyReading(state, { onNote: openNoteModal });
  renderHistory(state.data, surahMap);
  renderProfile(state.data, TOTAL_SURAHS, weighted, formatWeightedLabel(weighted));
  refreshWidgets();
  renderWidgets(getHomeWidgets(state.data, weighted), {
    onAction(widgetId) {
      if (widgetId === "daily") switchView("prier");
    }
  });
  renderFriends(friendsService.getFriends(), {
    canEncourage: (friendId) => friendsService.canEncourage(friendId),
    onEncourage(friendId) {
      friendsService.encourage(friendId);
      render();
    }
  });
  renderBadges(state.data);
  renderMonthlyHeatmap(state.data, "heatmapRoot", showHeatmapTooltip);
  renderMonthlyHeatmap(state.data, "heatmapProfileRoot", showHeatmapTooltip);
  renderAllNotes(state.data, surahMap, document.getElementById("notesSortSelect").value || "recent");
  document.body.classList.toggle("light", state.data.settings.theme === "light");
  document.getElementById("themeToggle").checked = state.data.settings.theme === "light";
  document.getElementById("vibrationToggle").checked = !!state.data.settings.vibration;
  document.getElementById("animationToggle").checked = !!state.data.settings.animations;
  document.getElementById("soundToggle").checked = !!state.data.settings.sound;
  document.getElementById("notificationsToggle").checked = !!state.data.settings.notifications.enabled;
  document.getElementById("notificationTimeInput").value = state.data.settings.notifications.time || "20:00";
}

async function refreshFirebaseFriends() {
  if (!isFirebaseConfigured() || !state.authUser) return;
  await syncUserStats(state.authUser.uid, {
    uid: state.authUser.uid,
    streak: state.data.streak.current,
    progress: state.data.progress.readCount,
    prestige: state.data.prestige
  });
  const [friends, requests] = await Promise.all([
    getFriends(state.authUser.uid),
    getIncomingFriendRequests(state.authUser.uid)
  ]);
  state.incomingRequests = requests;
  renderFriends(friends, {
    canEncourage: () => false,
    onEncourage: () => {}
  });
  renderFriendRequests(requests, {
    onAccept: async (req) => {
      await respondToFriendRequest(req.id, req.from, state.authUser.uid, true);
      await refreshFirebaseFriends();
    },
    onReject: async (req) => {
      await respondToFriendRequest(req.id, req.from, state.authUser.uid, false);
      await refreshFirebaseFriends();
    }
  });
}

function openFriendsModal() {
  document.getElementById("friendsModal")?.classList.remove("hidden");
}

function closeFriendsModal() {
  document.getElementById("friendsModal")?.classList.add("hidden");
}

function runFullReset() {
  showConfirm("Reset total: continuer ?").then(async (ok) => {
    if (!ok) return;
    const keepNotes = await showConfirm("Conserver les notes existantes ?");
    const notesBackup = keepNotes ? JSON.parse(JSON.stringify(state.data.notes || {})) : {};
    clearAll();
    state.data = validateData({});
    state.data.notes = notesBackup;
    state.currentPlan = [];
    state.query = "";
    state.activeNoteSurahId = null;
    state.activeEditNoteId = null;
    persist();
    showToast("Reinitialisation terminee.");
    window.location.reload();
  });
}

function runCycleReset() {
  showConfirm("Réinitialiser uniquement les lectures ?").then((ok) => {
    if (!ok) return;
    state.data.progress.readSurahs = [];
    state.data.progress.readCount = 0;
    persist();
    render();
  });
}

async function requestNotificationPermission() {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  return Notification.requestPermission();
}

function updateNotificationStatus() {
  const el = document.getElementById("notificationStatusText");
  if (!el) return;
  if (!("Notification" in window)) {
    el.textContent = "Indisponible (installer l'app PWA iOS)";
    return;
  }
  if (Notification.permission === "granted") el.textContent = "Accordee";
  else if (Notification.permission === "denied") el.textContent = "Refusee (PWA iOS requise)";
  else el.textContent = "En attente";
}

async function sendNotificationNow() {
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration();
  if (reg?.active) {
    reg.active.postMessage({
      type: "SCHEDULE_NOTIFICATION",
      when: Date.now() + 100,
      title: "Quran Tracker",
      body: "Il est temps de lire aujourd'hui 📖🔥",
      icon: "icon-192.png"
    });
  }
}

async function ensureDailyNotificationScheduling() {
  if (!state.data.settings.notifications.enabled) return;
  const perm = await requestNotificationPermission();
  updateNotificationStatus();
  if (perm !== "granted") {
    showToast("Notifications indisponibles. Sur iOS, installez l'app en PWA.");
    return;
  }
  const [h, m] = (state.data.settings.notifications.time || "20:00").split(":").map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(Number.isFinite(h) ? h : 20, Number.isFinite(m) ? m : 0, 0, 0);
  const today = now.toISOString().slice(0, 10);
  const alreadyReadToday = state.data.history.some((e) => e.valid && e.date.slice(0, 10) === today);
  if (now >= target && !alreadyReadToday && state.data.settings.notifications.lastSentDate !== today) {
    await sendNotificationNow();
    state.data.settings.notifications.lastSentDate = today;
    persist();
    return;
  }
  if ("serviceWorker" in navigator) {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg?.active) {
      if (target <= now) target.setDate(target.getDate() + 1);
      reg.active.postMessage({
        type: "SCHEDULE_NOTIFICATION",
        when: target.getTime(),
        title: "Quran Tracker",
        body: "Il est temps de lire aujourd'hui 📖🔥",
        icon: "icon-192.png"
      });
    }
  }
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("./service-worker.js");
  } catch {
    showToast("Service Worker indisponible.");
  }
}

function bindEvents() {
  const addTapListener = (el, handler) => {
    if (!el) return;
    let touched = false;
    el.addEventListener("touchend", (e) => {
      touched = true;
      e.preventDefault();
      handler(e);
    }, { passive: false });
    el.addEventListener("click", (e) => {
      if (touched) {
        touched = false;
        return;
      }
      handler(e);
    });
  };
  document.querySelectorAll(".nav-btn").forEach((btn) => btn.addEventListener("click", () => switchView(btn.dataset.view)));
  document.querySelectorAll(".time-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".time-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
  document.getElementById("searchInput").addEventListener("input", (e) => {
    state.query = e.target.value || "";
    render();
  });
  const btnGen = document.getElementById("generateBtn");
  if (btnGen && btnGen.parentNode) {
    const newBtn = btnGen.cloneNode(true);
    btnGen.parentNode.replaceChild(newBtn, btnGen);
    ["click", "touchend"].forEach((evt) => {
      newBtn.addEventListener(
        evt,
        function (e) {
          e.preventDefault();
          e.stopPropagation();
          generateDailyReading();
        },
        { passive: false }
      );
    });
  } else {
    console.error("[BTN] Bouton générer introuvable dans le DOM");
  }
  document.getElementById("completeBtn").addEventListener("click", completeDailyReading);
  document.getElementById("notesSortSelect").addEventListener("change", render);
  document.getElementById("saveNoteBtn").addEventListener("click", saveCurrentNote);
  document.getElementById("noteInput").addEventListener("input", (e) => {
    document.getElementById("noteCharCount").textContent = String((e.target.value || "").length);
  });
  document.getElementById("closeNotesBtn").addEventListener("click", () => {
    state.activeNoteSurahId = null;
    state.activeEditNoteId = null;
    closeNotesModal();
  });
  document.getElementById("settingsOpenBtn").addEventListener("click", () => document.getElementById("settingsModal").classList.remove("hidden"));
  document.getElementById("closeSettingsBtn").addEventListener("click", () => document.getElementById("settingsModal").classList.add("hidden"));
  addTapListener(document.getElementById("closeMarkDateBtn"), closeMarkDateModal);
  addTapListener(document.getElementById("cancelMarkDateBtn"), closeMarkDateModal);
  addTapListener(document.getElementById("confirmMarkDateBtn"), confirmMarkDate);
  document.getElementById("addFriendBtn")?.addEventListener("click", openFriendsModal);
  document.getElementById("closeFriendsModalBtn")?.addEventListener("click", closeFriendsModal);
  document.getElementById("friendSearchBtn")?.addEventListener("click", async () => {
    const input = document.getElementById("friendSearchInput");
    const term = (input?.value || "").trim();
    if (!term) return;
    if (!isFirebaseConfigured() || !state.authUser) return showToast("Firebase non configure.");
    const results = await searchUsersByPseudoOrEmail(term, state.authUser.uid);
    const root = document.getElementById("friendSearchResults");
    root.innerHTML = "";
    if (!results.length) {
      root.innerHTML = '<p class="muted">Aucun utilisateur trouvé.</p>';
      return;
    }
    results.forEach((user) => {
      const card = document.createElement("div");
      card.className = "friend-card";
      card.innerHTML = `<strong>${user.pseudo || user.email}</strong><div class="muted">🔥 ${user.streak || 0} jours</div>`;
      const btn = document.createElement("button");
      btn.className = "secondary-btn";
      btn.textContent = "Ajouter";
      btn.addEventListener("click", async () => {
        await sendFriendRequest(state.authUser.uid, user.uid);
        showToast("Demande envoyee.");
      });
      card.appendChild(btn);
      root.appendChild(card);
    });
  });
  addTapListener(document.getElementById("markTodayBtn"), () => {
    state.pendingMarkDateChoice = "today";
    document.getElementById("markCustomDateWrap")?.classList.add("hidden");
    document.getElementById("markTodayBtn")?.classList.add("active");
    document.getElementById("markYesterdayBtn")?.classList.remove("active");
    document.getElementById("markCustomBtn")?.classList.remove("active");
  });
  addTapListener(document.getElementById("markYesterdayBtn"), () => {
    state.pendingMarkDateChoice = "yesterday";
    document.getElementById("markCustomDateWrap")?.classList.add("hidden");
    document.getElementById("markTodayBtn")?.classList.remove("active");
    document.getElementById("markYesterdayBtn")?.classList.add("active");
    document.getElementById("markCustomBtn")?.classList.remove("active");
  });
  addTapListener(document.getElementById("markCustomBtn"), () => {
    state.pendingMarkDateChoice = "custom";
    const wrap = document.getElementById("markCustomDateWrap");
    const input = document.getElementById("markCustomDateInput");
    if (input && !input.value) input.value = new Date().toISOString().slice(0, 10);
    wrap?.classList.remove("hidden");
    document.getElementById("markTodayBtn")?.classList.remove("active");
    document.getElementById("markYesterdayBtn")?.classList.remove("active");
    document.getElementById("markCustomBtn")?.classList.add("active");
    input?.focus();
  });
  document.getElementById("authSignUpBtn")?.addEventListener("click", async () => {
    if (!isFirebaseConfigured()) return showToast("Configure Firebase d'abord.");
    try {
      const pseudo = document.getElementById("authPseudoInput").value.trim();
      const email = document.getElementById("authEmailInput").value.trim();
      const password = document.getElementById("authPasswordInput").value;
      await signUp(pseudo, email, password);
    } catch {
      showToast("Erreur inscription.");
    }
  });
  document.getElementById("authSignInBtn")?.addEventListener("click", async () => {
    if (!isFirebaseConfigured()) return showToast("Configure Firebase d'abord.");
    try {
      const email = document.getElementById("authEmailInput").value.trim();
      const password = document.getElementById("authPasswordInput").value;
      await signIn(email, password);
    } catch {
      showToast("Erreur connexion.");
    }
  });
  document.getElementById("themeToggle").addEventListener("change", (e) => {
    state.data.settings.theme = e.target.checked ? "light" : "dark";
    persist();
    render();
  });
  document.getElementById("vibrationToggle").addEventListener("change", (e) => {
    state.data.settings.vibration = e.target.checked;
    persist();
  });
  document.getElementById("animationToggle").addEventListener("change", (e) => {
    state.data.settings.animations = e.target.checked;
    persist();
  });
  document.getElementById("soundToggle").addEventListener("change", (e) => {
    state.data.settings.sound = e.target.checked;
    persist();
  });
  document.getElementById("notificationsToggle").addEventListener("change", (e) => {
    state.data.settings.notifications.enabled = e.target.checked;
    persist();
    ensureDailyNotificationScheduling();
  });
  document.getElementById("notificationTimeInput").addEventListener("change", (e) => {
    state.data.settings.notifications.time = e.target.value || "20:00";
    persist();
    ensureDailyNotificationScheduling();
  });
  document.getElementById("testNotificationBtn").addEventListener("click", async () => {
    const perm = await requestNotificationPermission();
    updateNotificationStatus();
    if (perm !== "granted") return showToast("Permission non accordee.");
    await sendNotificationNow();
    showToast("Notification de test envoyee.");
  });
  document.getElementById("manualResetBtn").addEventListener("click", runCycleReset);
  document.getElementById("hardResetAllBtn").addEventListener("click", runFullReset);
  document.getElementById("hardResetBtn").addEventListener("click", runFullReset);
  document.getElementById("exportBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quran-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });
  document.getElementById("importInput").addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(String(reader.result || "{}"));
        state.data = saveAppData(imported);
        render();
      } catch {
        showToast("Fichier invalide.");
      }
    };
    reader.readAsText(file);
  });
}

function playSuccessSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    [660, 880].forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.frequency.value = freq;
      gain.gain.value = 0.02;
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      const start = audioCtx.currentTime + i * 0.08;
      osc.start(start);
      osc.stop(start + 0.06);
    });
  } catch {
    /* ignore */
  }
}

function launchConfetti(count) {
  const root = document.getElementById("confettiContainer");
  const colors = ["#18a06a", "#d8b971", "#f7f4eb", "#46dca1"];
  for (let i = 0; i < count; i++) {
    const el = document.createElement("span");
    el.className = "confetti";
    el.style.left = `${Math.random() * 100}vw`;
    el.style.background = colors[Math.floor(Math.random() * colors.length)];
    el.style.animationDuration = `${1000 + Math.random() * 1000}ms`;
    root.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }
}

evaluateBadges(state.data, showAchievementBanner);
friendsService = createFriendsService(state.data, persist, showToast);
bindEvents();
render();
setRandomQuote();
updateNotificationStatus();
(async () => {
  await registerServiceWorker();
  await ensureDailyNotificationScheduling();
})();
if (isFirebaseConfigured()) {
  watchAuth(async (user) => {
    state.authUser = user || null;
    document.getElementById("authGate")?.classList.toggle("hidden", !!user);
    if (user) {
      await refreshFirebaseFriends();
      const badge = document.getElementById("profilePendingBadge");
      if (badge) badge.classList.toggle("hidden", !state.incomingRequests.length);
    }
  });
} else {
  document.getElementById("authGate")?.classList.add("hidden");
}
try {
  const raw = localStorage.getItem("quranTrackerData");
  if (raw) JSON.parse(raw);
} catch {
  showToast("Donnees restaurees depuis la sauvegarde");
}
