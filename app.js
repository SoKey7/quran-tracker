"use strict";

const APP_VERSION = "1.0.0";
const STORAGE_ROOT_KEY = "quranTrackerStore";
const STORAGE_BACKUPS_KEY = "quranTrackerBackups";
const STORAGE_LEGACY_KEYS = ["profile", "progress", "readSurahs", "history", "prestige", "streak", "settings"];
const MAX_BACKUPS = 10;
const TOTAL_SURAHS = 114;

const AYAH_COUNTS = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135, 112, 78, 118, 64,
  77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49,
  62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42,
  29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6
];

const SURAH_NAMES_FR = [
  "L'Ouverture", "La Vache", "La Famille d'Imran", "Les Femmes", "La Table Servie", "Les Bestiaux", "Les Murailles",
  "Le Butin", "Le Repentir", "Younous", "Houd", "Youssouf", "Le Tonnerre", "Abraham", "Al-Hijr", "Les Abeilles",
  "Le Voyage Nocturne", "La Caverne", "Marie", "Ta-Ha", "Les Prophètes", "Le Pèlerinage", "Les Croyants", "La Lumière",
  "Le Discernement", "Les Poètes", "Les Fourmis", "Le Récit", "L'Araignée", "Les Romains", "Luqman", "La Prosternation",
  "Les Coalisés", "Saba", "Le Créateur", "Ya-Sin", "Les Rangés", "Sad", "Les Groupes", "Le Pardonneur", "Les Versets Détaillés",
  "La Consultation", "L'Ornement", "La Fumée", "L'Agenouillée", "Les Dunes", "Muhammad", "La Victoire", "Les Appartements",
  "Qaf", "Qui Éparpillent", "Le Mont", "L'Étoile", "La Lune", "Le Tout Miséricordieux", "L'Événement", "Le Fer", "La Discussion",
  "Le Rassemblement", "L'Éprouvée", "Le Rang", "Le Vendredi", "Les Hypocrites", "La Grande Perte", "Le Divorce", "L'Interdiction",
  "La Royauté", "La Plume", "L'Inévitable", "Les Voies d'Ascension", "Noé", "Les Djinns", "L'Enveloppé", "Le Revêtu", "La Résurrection",
  "L'Homme", "Les Envoyés", "La Nouvelle", "Les Anges qui Arrachent", "Il s'est Renfrogné", "L'Obscurcissement", "La Fissure",
  "Les Fraudeurs", "La Déchirure", "Les Constellations", "L'Astre Nocturne", "Le Très-Haut", "L'Enveloppante", "L'Aube",
  "La Cité", "Le Soleil", "La Nuit", "Le Jour Montant", "L'Ouverture de la Poitrine", "Le Figuier", "L'Adhérence",
  "La Destinée", "La Preuve", "Le Séisme", "Les Coursiers", "Le Fracas", "La Course aux Richesses", "Le Temps", "Les Calomniateurs",
  "L'Éléphant", "Quraych", "L'Ustensile", "L'Abondance", "Les Mécréants", "Le Secours", "Les Fibres", "Le Monothéisme Pur",
  "L'Aube Naissante", "Les Hommes"
];

const MOTIVATION_QUOTES = [
  "Chaque verset lu est une lumière pour ton coeur.",
  "Une petite lecture sincère vaut mieux qu'une grande lecture reportée.",
  "La constance transforme l'effort en victoire spirituelle.",
  "Aujourd'hui est le meilleur jour pour avancer d'une sourate.",
  "Ton rythme est unique: avance avec coeur et discipline."
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

const state = {
  meta: { appVersion: APP_VERSION, createdAt: null, updatedAt: null },
  profile: null,
  progress: null,
  readSurahs: [],
  history: [],
  prestige: 0,
  streak: null,
  settings: null,
  currentPlan: [],
  pendingMarkSurah: null,
  notificationTimeoutId: null
};

function getDefaults() {
  return {
    meta: { appVersion: APP_VERSION, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    profile: { avatar: null, stats: { totalSessions: 0, totalMinutes: 0, totalSurahsValidated: 0 } },
    progress: { readCount: 0, total: TOTAL_SURAHS, cyclesCompleted: 0 },
    readSurahs: [],
    history: [],
    prestige: 0,
    streak: { current: 0, max: 0, lastDate: null },
    settings: {
      theme: "dark",
      vibration: true,
      animations: true,
      sound: false,
      notifications: { enabled: false, time: "20:00", lastSentDate: null }
    }
  };
}

function boot() {
  hydrateState();
  bindEvents();
  applyTheme();
  setRandomQuote();
  updateAllUI();
  renderSearchResults(surahs);
  scheduleDailyNotification();
  registerServiceWorker();
}

function parseJSONSafe(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function readLegacyStore() {
  const legacy = {};
  STORAGE_LEGACY_KEYS.forEach((k) => {
    legacy[k] = parseJSONSafe(localStorage.getItem(k), null);
  });
  return legacy;
}

function mergeMissingOnly(source, defaults) {
  if (Array.isArray(defaults)) {
    return Array.isArray(source) ? source : defaults;
  }
  if (defaults && typeof defaults === "object") {
    const out = { ...defaults };
    const src = source && typeof source === "object" ? source : {};
    Object.keys(src).forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(defaults, key)) {
        out[key] = mergeMissingOnly(src[key], defaults[key]);
      } else {
        out[key] = src[key];
      }
    });
    return out;
  }
  return source ?? defaults;
}

function migrateStore(rawStore) {
  const defaults = getDefaults();
  const source = rawStore && typeof rawStore === "object" ? rawStore : {};
  const merged = mergeMissingOnly(source, defaults);
  if (!merged.meta.createdAt) merged.meta.createdAt = new Date().toISOString();
  merged.meta.updatedAt = new Date().toISOString();
  merged.meta.appVersion = APP_VERSION;
  merged.progress.total = TOTAL_SURAHS;
  merged.progress.readCount = Math.min(TOTAL_SURAHS, new Set(merged.readSurahs).size);
  merged.readSurahs = Array.from(new Set(merged.readSurahs.filter((n) => Number.isInteger(n) && n > 0 && n <= TOTAL_SURAHS)));
  return merged;
}

function hydrateState() {
  const fromVersioned = parseJSONSafe(localStorage.getItem(STORAGE_ROOT_KEY), null);
  const legacy = readLegacyStore();
  const hasLegacyData = STORAGE_LEGACY_KEYS.some((k) => legacy[k] !== null);
  const seed = fromVersioned || (hasLegacyData ? legacy : null);
  const migrated = migrateStore(seed);
  state.meta = migrated.meta;
  state.profile = migrated.profile;
  state.progress = migrated.progress;
  state.readSurahs = migrated.readSurahs;
  state.history = migrated.history;
  state.prestige = Number.isFinite(migrated.prestige) ? migrated.prestige : 0;
  state.streak = migrated.streak;
  state.settings = migrated.settings;
  persist({ backupReason: hasLegacyData ? "legacy-migration" : "boot" });
}

function persist(options = {}) {
  state.meta.updatedAt = new Date().toISOString();
  state.meta.appVersion = APP_VERSION;
  const payload = {
    meta: state.meta,
    profile: state.profile,
    progress: state.progress,
    readSurahs: state.readSurahs,
    history: state.history,
    prestige: state.prestige,
    streak: state.streak,
    settings: state.settings
  };
  localStorage.setItem(STORAGE_ROOT_KEY, JSON.stringify(payload));
  localStorage.setItem("app_version", APP_VERSION);

  if (options.backupReason) {
    createAutoBackup(options.backupReason, payload);
  }
}

function createAutoBackup(reason, payload) {
  const raw = parseJSONSafe(localStorage.getItem(STORAGE_BACKUPS_KEY), []);
  const backups = Array.isArray(raw) ? raw : [];
  backups.unshift({
    id: `backup-${Date.now()}`,
    reason,
    createdAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    data: payload
  });
  localStorage.setItem(STORAGE_BACKUPS_KEY, JSON.stringify(backups.slice(0, MAX_BACKUPS)));
}

function bindEvents() {
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });
  document.querySelectorAll(".time-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".time-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  document.getElementById("generateBtn").addEventListener("click", generateDailyReading);
  document.getElementById("completeBtn").addEventListener("click", completeDailyReading);
  document.getElementById("searchInput").addEventListener("input", onSearchInput);
  document.getElementById("manualResetBtn").addEventListener("click", manualResetReadSurahs);
  document.getElementById("settingsOpenBtn").addEventListener("click", openSettings);
  document.getElementById("closeSettingsBtn").addEventListener("click", closeSettings);
  document.getElementById("exportBtn").addEventListener("click", exportData);
  document.getElementById("importInput").addEventListener("change", importData);
  document.getElementById("hardResetBtn").addEventListener("click", hardResetAll);
  document.getElementById("closeMarkDateBtn").addEventListener("click", closeMarkDateModal);
  document.getElementById("confirmMarkDateBtn").addEventListener("click", confirmMarkSurahWithDate);

  document.getElementById("themeToggle").addEventListener("change", (e) => {
    state.settings.theme = e.target.checked ? "light" : "dark";
    applyTheme();
    persist({ backupReason: "settings-theme" });
  });
  document.getElementById("vibrationToggle").addEventListener("change", (e) => {
    state.settings.vibration = e.target.checked;
    persist({ backupReason: "settings-vibration" });
  });
  document.getElementById("animationToggle").addEventListener("change", (e) => {
    state.settings.animations = e.target.checked;
    persist({ backupReason: "settings-animation" });
  });
  document.getElementById("soundToggle").addEventListener("change", (e) => {
    state.settings.sound = e.target.checked;
    persist({ backupReason: "settings-sound" });
  });
  document.getElementById("notificationsToggle").addEventListener("change", onNotificationToggle);
  document.getElementById("notificationTimeInput").addEventListener("change", (e) => {
    state.settings.notifications.time = e.target.value || "20:00";
    persist({ backupReason: "settings-notification-time" });
    scheduleDailyNotification();
  });
}

function switchView(viewName) {
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  document.getElementById(`view-${viewName}`).classList.add("active");
  document.querySelectorAll(".nav-btn").forEach((n) => n.classList.toggle("active", n.dataset.view === viewName));
  const title = document.getElementById(`view-${viewName}`).dataset.title || "Quran Tracker";
  document.getElementById("pageTitleText").textContent = title;
  if (viewName === "accueil") {
    renderTimeline();
    renderWidgets();
    renderHeatmap();
    renderBadges();
  }
  if (viewName === "profil") renderProfileStats();
}

function getSelectedMinutes() {
  const selected = document.querySelector(".time-btn.active");
  return Number(selected?.dataset.minutes || 10);
}

function generateDailyReading() {
  const unread = surahs.filter((s) => !state.readSurahs.includes(s.numero));
  if (!unread.length) {
    showToast("Toutes les sourates sont déjà lues pour ce cycle.");
    return;
  }
  const targetCountByMinutes = { 10: 2, 20: 3, 30: 4 };
  const count = targetCountByMinutes[getSelectedMinutes()] || 2;
  const byCat = {
    TresCourte: unread.filter((s) => s.categorie === "TresCourte"),
    Courte: unread.filter((s) => s.categorie === "Courte"),
    Moyenne: unread.filter((s) => s.categorie === "Moyenne"),
    Longue: unread.filter((s) => s.categorie === "Longue")
  };
  const draft = [];
  const categoryOrder = ["TresCourte", "Courte", "Moyenne", "Longue"];
  while (draft.length < count) {
    let found = false;
    for (const cat of categoryOrder) {
      if (draft.length >= count) break;
      if (byCat[cat].length) {
        const pick = byCat[cat].splice(Math.floor(Math.random() * byCat[cat].length), 1)[0];
        draft.push(pick);
        found = true;
      }
    }
    if (!found) break;
  }
  state.currentPlan = draft;
  renderDailyReading();
  showToast("Lecture du jour générée.");
}

function completeDailyReading() {
  if (!state.currentPlan.length) return;
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const minutes = getSelectedMinutes();
  let newValidated = 0;
  state.currentPlan.forEach((s) => {
    if (!state.readSurahs.includes(s.numero)) {
      state.readSurahs.push(s.numero);
      newValidated++;
    }
  });
  state.history.unshift({ date: now.toISOString(), surahs: state.currentPlan.map((s) => s.numero), minutes });
  updateStreak(today);
  state.profile.stats.totalSessions += 1;
  state.profile.stats.totalMinutes += minutes;
  state.profile.stats.totalSurahsValidated += newValidated;
  state.progress.readCount = state.readSurahs.length;
  const prestigeAwarded = checkPrestige();
  persist({ backupReason: "complete-reading" });
  updateAllUI();
  renderDailyReading();
  triggerCompletionFX(prestigeAwarded);
}

function resolveDateChoice(choice) {
  const now = new Date();
  if (choice === "today") return now;
  if (choice === "yesterday") {
    now.setDate(now.getDate() - 1);
    return now;
  }
  const customRaw = document.getElementById("markCustomDateInput").value;
  if (customRaw) {
    const custom = new Date(`${customRaw}T12:00:00`);
    if (!Number.isNaN(custom.getTime())) return custom;
  }
  return new Date();
}

function openMarkDateModal(surahNumber) {
  state.pendingMarkSurah = surahNumber;
  const surah = surahs[surahNumber - 1];
  document.getElementById("markDateModalSurah").textContent = `${surahNumber}. ${surah ? surah.nomFr : ""}`.trim();
  document.getElementById("markDateModal").classList.remove("hidden");
}

function closeMarkDateModal() {
  state.pendingMarkSurah = null;
  document.getElementById("markDateModal").classList.add("hidden");
}

function confirmMarkSurahWithDate() {
  const numero = state.pendingMarkSurah;
  if (!numero) return;
  const choice = document.querySelector("input[name='markDateChoice']:checked")?.value || "today";
  const readDate = resolveDateChoice(choice);
  if (!state.readSurahs.includes(numero)) state.readSurahs.push(numero);
  state.history.unshift({ date: readDate.toISOString(), surahs: [numero], minutes: 0, type: "manual" });
  state.progress.readCount = state.readSurahs.length;
  updateStreak(readDate.toISOString().slice(0, 10));
  checkPrestige();
  persist({ backupReason: "manual-mark" });
  updateAllUI();
  onSearchInput({ target: document.getElementById("searchInput") });
  closeMarkDateModal();
  showToast("Sourate marquée avec date personnalisée.");
}

function onSearchInput(e) {
  const q = e.target.value.trim().toLowerCase();
  if (!q) return renderSearchResults(surahs);
  const filtered = surahs.filter((s) => `${s.numero}`.includes(q) || s.nomFr.toLowerCase().includes(q));
  renderSearchResults(filtered);
}

function renderSearchResults(items) {
  const root = document.getElementById("searchResults");
  root.innerHTML = "";
  items.forEach((s) => {
    const isRead = state.readSurahs.includes(s.numero);
    const row = document.createElement("div");
    row.className = "result-item";
    row.innerHTML = `
      <div>
        <strong>${s.numero}. ${s.nomFr}</strong>
        <div class="muted">${s.categorie}</div>
      </div>
      <button class="${isRead ? "remove" : ""}">${isRead ? "Retirer" : "Marquer lue"}</button>
    `;
    row.querySelector("button").addEventListener("click", () => {
      if (isRead) toggleSurahRead(s.numero);
      else openMarkDateModal(s.numero);
    });
    root.appendChild(row);
  });
}

function toggleSurahRead(numero) {
  const idx = state.readSurahs.indexOf(numero);
  if (idx >= 0) state.readSurahs.splice(idx, 1);
  state.progress.readCount = state.readSurahs.length;
  persist({ backupReason: "manual-unmark" });
  updateAllUI();
  onSearchInput({ target: document.getElementById("searchInput") });
}

function updateStreak(today) {
  const last = state.streak.lastDate;
  if (!last) state.streak.current = 1;
  else if (last === today) return;
  else {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yesterday = y.toISOString().slice(0, 10);
    state.streak.current = last === yesterday ? state.streak.current + 1 : 1;
  }
  state.streak.lastDate = today;
  state.streak.max = Math.max(state.streak.max, state.streak.current);
}

function checkPrestige() {
  if (state.readSurahs.length < TOTAL_SURAHS) return false;
  state.prestige += 1;
  state.progress.cyclesCompleted += 1;
  state.readSurahs = [];
  state.progress.readCount = 0;
  state.history.unshift({ date: new Date().toISOString(), surahs: [], minutes: 0, type: "prestige" });
  showToast(`Nouveau niveau atteint: Prestige ${state.prestige} !`);
  return true;
}

function renderDailyReading() {
  const list = document.getElementById("dailyReadingList");
  const completeBtn = document.getElementById("completeBtn");
  list.innerHTML = "";
  if (!state.currentPlan.length) {
    list.innerHTML = '<li class="muted">Aucune lecture générée.</li>';
    completeBtn.disabled = true;
    return;
  }
  state.currentPlan.forEach((s) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${s.numero}. ${s.nomFr}</strong><br><span class="muted">${s.categorie}</span>`;
    list.appendChild(li);
  });
  completeBtn.disabled = false;
}

function renderTimeline() {
  const root = document.getElementById("timeline");
  root.innerHTML = "";
  if (!state.history.length) {
    root.innerHTML = '<p class="muted">Aucune lecture enregistrée.</p>';
    return;
  }
  state.history.slice(0, 60).forEach((entry) => {
    const div = document.createElement("div");
    div.className = "timeline-item";
    const dateLabel = formatRelativeDate(entry.date);
    if (entry.type === "prestige") {
      div.innerHTML = `<div class="muted">${dateLabel}</div><strong>🏆 Prestige augmenté (${state.prestige})</strong>`;
    } else {
      const names = (entry.surahs || []).map((n) => `${n} ${surahs[n - 1]?.nomFr || ""}`.trim());
      div.innerHTML = `<div class="muted">${dateLabel}</div><strong>${names.join(" · ") || "Validation manuelle"}</strong>`;
    }
    root.appendChild(div);
  });
}

function renderWidgets() {
  const root = document.getElementById("widgetsRoot");
  const percent = Math.round((state.progress.readCount / TOTAL_SURAHS) * 100);
  root.innerHTML = "";
  const widgetSpecs = [
    { title: "Streak", value: `🔥 ${state.streak.current} jours` },
    { title: "Progress", value: `${state.progress.readCount} / ${TOTAL_SURAHS} (${percent}%)` },
    { title: "Daily", value: "Commencer lecture", action: true }
  ];
  widgetSpecs.forEach((w) => {
    const card = document.createElement("div");
    card.className = "widget-card";
    card.innerHTML = `<h4>${w.title}</h4><div class="widget-value">${w.value}</div>`;
    if (w.action) {
      const button = document.createElement("button");
      button.className = "widget-action";
      button.textContent = "Commencer lecture";
      button.addEventListener("click", () => {
        switchView("prier");
        generateDailyReading();
      });
      card.appendChild(button);
    }
    root.appendChild(card);
  });
}

function renderHeatmap() {
  const root = document.getElementById("heatmapRoot");
  root.innerHTML = "";
  const daysToRender = 30;
  const perDay = new Map();
  state.history.forEach((entry) => {
    const dayKey = String(entry.date).slice(0, 10);
    const count = (entry.surahs || []).length || (entry.type === "prestige" ? 1 : 0);
    perDay.set(dayKey, (perDay.get(dayKey) || 0) + count);
  });
  for (let i = daysToRender - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const value = perDay.get(key) || 0;
    const level = value >= 5 ? 4 : value >= 3 ? 3 : value >= 1 ? 2 : 0;
    const cell = document.createElement("div");
    cell.className = "heatmap-cell";
    cell.dataset.level = `${level}`;
    cell.title = `${key}: ${value} sourate(s)`;
    root.appendChild(cell);
  }
}

function renderBadges() {
  const root = document.getElementById("badgesRoot");
  root.innerHTML = "";
  const badges = [
    { id: "first", title: "Premier pas", ok: state.history.length > 0, desc: "1 lecture validée" },
    { id: "streak7", title: "Constance", ok: state.streak.max >= 7, desc: "7 jours de série" },
    { id: "half", title: "Moitié", ok: state.profile.stats.totalSurahsValidated >= 57, desc: "57 sourates validées" },
    { id: "prestige", title: "Prestige", ok: state.prestige >= 1, desc: "1 cycle complet" }
  ];
  badges.forEach((b) => {
    const card = document.createElement("div");
    card.className = `badge-card ${b.ok ? "" : "locked"}`.trim();
    card.innerHTML = `<h4>${b.ok ? "🏅" : "🔒"} ${b.title}</h4><div class="muted">${b.desc}</div>`;
    root.appendChild(card);
  });
}

function renderProfileStats() {
  const percent = Math.round((state.progress.readCount / TOTAL_SURAHS) * 100);
  document.getElementById("profileProgressText").textContent = `${state.progress.readCount} / ${TOTAL_SURAHS}`;
  document.getElementById("profileProgressPercent").textContent = `${percent}%`;
  document.getElementById("statTotalTime").textContent = `${state.profile.stats.totalMinutes} min`;
  document.getElementById("statSessions").textContent = `${state.profile.stats.totalSessions}`;
  document.getElementById("statStreak").textContent = `${state.streak.current}`;
  document.getElementById("statPrestige").textContent = `Prestige ${state.prestige}`;
  document.getElementById("statCycles").textContent = `${state.progress.cyclesCompleted}`;
  const last = state.history[0]?.date;
  document.getElementById("statLastRead").textContent = last ? new Date(last).toLocaleDateString("fr-FR") : "Aucune";
  if (!state.history.length) document.getElementById("statAvgDay").textContent = "0 min";
  else {
    const first = new Date(state.history[state.history.length - 1].date);
    const days = Math.max(1, Math.ceil((Date.now() - first.getTime()) / 86400000));
    document.getElementById("statAvgDay").textContent = `${Math.round(state.profile.stats.totalMinutes / days)} min`;
  }
}

function updateAllUI() {
  const percent = Math.round((state.progress.readCount / TOTAL_SURAHS) * 100);
  document.getElementById("progressText").textContent = `${state.progress.readCount} / ${TOTAL_SURAHS}`;
  document.getElementById("progressPercent").textContent = `${percent}%`;
  document.getElementById("globalProgressFill").style.width = `${percent}%`;
  document.getElementById("streakLabel").textContent = `🔥 ${state.streak.current} jours`;
  document.getElementById("prestigeBadge").textContent = `⭐ Prestige ${state.prestige}`;
  document.getElementById("themeToggle").checked = state.settings.theme === "light";
  document.getElementById("vibrationToggle").checked = !!state.settings.vibration;
  document.getElementById("animationToggle").checked = !!state.settings.animations;
  document.getElementById("soundToggle").checked = !!state.settings.sound;
  document.getElementById("notificationsToggle").checked = !!state.settings.notifications.enabled;
  document.getElementById("notificationTimeInput").value = state.settings.notifications.time || "20:00";
  renderTimeline();
  renderProfileStats();
  renderWidgets();
  renderHeatmap();
  renderBadges();
}

function onNotificationToggle(e) {
  if (!e.target.checked) {
    state.settings.notifications.enabled = false;
    persist({ backupReason: "notifications-disabled" });
    scheduleDailyNotification();
    return;
  }
  requestNotificationPermission().then((granted) => {
    state.settings.notifications.enabled = granted;
    if (!granted) showToast("Permission notifications refusée.");
    persist({ backupReason: "notifications-toggle" });
    updateAllUI();
    scheduleDailyNotification();
  });
}

async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    showToast("Notifications non supportées.");
    return false;
  }
  if (Notification.permission === "granted") return true;
  const result = await Notification.requestPermission();
  return result === "granted";
}

function scheduleDailyNotification() {
  if (state.notificationTimeoutId) {
    clearTimeout(state.notificationTimeoutId);
    state.notificationTimeoutId = null;
  }
  if (!state.settings.notifications.enabled || Notification.permission !== "granted") return;
  const [h, m] = (state.settings.notifications.time || "20:00").split(":").map(Number);
  const next = new Date();
  next.setHours(Number.isFinite(h) ? h : 20, Number.isFinite(m) ? m : 0, 0, 0);
  if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1);
  const delay = next.getTime() - Date.now();
  state.notificationTimeoutId = setTimeout(async () => {
    await showReminderNotification();
    scheduleDailyNotification();
  }, delay);
}

async function showReminderNotification() {
  const today = new Date().toISOString().slice(0, 10);
  if (state.settings.notifications.lastSentDate === today) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.showNotification("Quran Tracker", {
        body: "Il est temps de lire aujourd'hui 📖🔥",
        icon: "icon-192.png",
        badge: "icon-192.png",
        tag: "daily-quran-reminder"
      });
    } else {
      new Notification("Quran Tracker", { body: "Il est temps de lire aujourd'hui 📖🔥", icon: "icon-192.png" });
    }
    state.settings.notifications.lastSentDate = today;
    persist({ backupReason: "daily-notification" });
  } catch {
    showToast("Erreur notification.");
  }
}

function setRandomQuote() {
  const q = MOTIVATION_QUOTES[Math.floor(Math.random() * MOTIVATION_QUOTES.length)];
  document.getElementById("quoteText").textContent = q;
}

function formatRelativeDate(iso) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const h = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (h < 24) return `Il y a ${h || 1} heure${h > 1 ? "s" : ""}`;
  if (days === 1) return "Hier";
  return `Il y a ${days} jours`;
}

function manualResetReadSurahs() {
  if (!confirm("Confirmer reset manuel du cycle en cours ?")) return;
  if (!confirm("Deuxième confirmation: garder historique mais remettre les sourates lues à 0 ?")) return;
  state.readSurahs = [];
  state.progress.readCount = 0;
  persist({ backupReason: "manual-cycle-reset" });
  updateAllUI();
  renderSearchResults(surahs);
  showToast("Progression du cycle réinitialisée.");
}

function hardResetAll() {
  if (!confirm("Reset total manuel demandé. Continuer ?")) return;
  const phrase = prompt("Tape EXACTEMENT RESET COMPLET pour confirmer:");
  if (phrase !== "RESET COMPLET") return showToast("Reset annulé.");
  createAutoBackup("hard-reset-before", {
    meta: state.meta,
    profile: state.profile,
    progress: state.progress,
    readSurahs: state.readSurahs,
    history: state.history,
    prestige: state.prestige,
    streak: state.streak,
    settings: state.settings
  });
  localStorage.removeItem(STORAGE_ROOT_KEY);
  STORAGE_LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
  location.reload();
}

function openSettings() {
  document.getElementById("settingsModal").classList.remove("hidden");
}

function closeSettings() {
  document.getElementById("settingsModal").classList.add("hidden");
}

function exportData() {
  const payload = parseJSONSafe(localStorage.getItem(STORAGE_ROOT_KEY), {});
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `quran-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Export JSON prêt.");
}

function importData(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = parseJSONSafe(String(reader.result || "{}"), {});
      const migrated = migrateStore(imported);
      localStorage.setItem(STORAGE_ROOT_KEY, JSON.stringify(migrated));
      showToast("Import réussi. Rechargement...");
      setTimeout(() => location.reload(), 450);
    } catch {
      showToast("Import invalide.");
    }
  };
  reader.readAsText(file);
}

function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 1900);
}

function triggerCompletionFX(prestigeAwarded) {
  if (state.settings.vibration && navigator.vibrate) navigator.vibrate([80, 30, 120]);
  if (state.settings.sound) playSuccessSound();
  if (state.settings.animations) launchConfetti(prestigeAwarded ? 140 : 80);
  showToast(prestigeAwarded ? "Cycle terminé: Prestige +1" : "Lecture validée !");
}

function playSuccessSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [660, 880, 1040];
    notes.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.frequency.value = freq;
      gain.gain.value = 0.02;
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      const start = audioCtx.currentTime + idx * 0.08;
      osc.start(start);
      osc.stop(start + 0.07);
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
    el.style.animationDuration = `${900 + Math.random() * 1100}ms`;
    root.appendChild(el);
    setTimeout(() => el.remove(), 2000);
  }
}

function applyTheme() {
  document.body.classList.toggle("light", state.settings.theme === "light");
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      /* ignore */
    });
  }
}

boot();
