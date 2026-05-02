"use strict";

const STORAGE_KEYS = ["profile", "progress", "readSurahs", "history", "prestige", "streak", "settings"];
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

const state = {
  profile: null,
  progress: null,
  readSurahs: [],
  history: [],
  prestige: 0,
  streak: null,
  settings: null,
  currentPlan: []
};

const surahs = Array.from({ length: TOTAL_SURAHS }, (_, i) => {
  const numero = i + 1;
  const ayahs = AYAH_COUNTS[i];
  let categorie = "Longue";
  if (ayahs <= 10) categorie = "TresCourte";
  else if (ayahs <= 40) categorie = "Courte";
  else if (ayahs <= 120) categorie = "Moyenne";
  return { numero, nomFr: SURAH_NAMES_FR[i], categorie };
});

function boot() {
  hydrateState();
  bindEvents();
  applyTheme();
  setRandomQuote();
  updateAllUI();
  renderSearchResults(surahs);
  registerServiceWorker();
}

function hydrateState() {
  const stored = {};
  STORAGE_KEYS.forEach((k) => {
    const raw = localStorage.getItem(k);
    stored[k] = raw ? JSON.parse(raw) : null;
  });

  state.profile = stored.profile || { avatar: null, stats: { totalSessions: 0, totalMinutes: 0, totalSurahsValidated: 0 } };
  state.progress = stored.progress || { readCount: 0, total: TOTAL_SURAHS, cyclesCompleted: 0 };
  state.readSurahs = stored.readSurahs || [];
  state.history = stored.history || [];
  state.prestige = Number.isFinite(stored.prestige) ? stored.prestige : 0;
  state.streak = stored.streak || { current: 0, max: 0, lastDate: null };
  state.settings = stored.settings || { theme: "dark", vibration: true, animations: true, sound: false };
}

function persist() {
  localStorage.setItem("profile", JSON.stringify(state.profile));
  localStorage.setItem("progress", JSON.stringify(state.progress));
  localStorage.setItem("readSurahs", JSON.stringify(state.readSurahs));
  localStorage.setItem("history", JSON.stringify(state.history));
  localStorage.setItem("prestige", JSON.stringify(state.prestige));
  localStorage.setItem("streak", JSON.stringify(state.streak));
  localStorage.setItem("settings", JSON.stringify(state.settings));
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

  document.getElementById("themeToggle").addEventListener("change", (e) => {
    state.settings.theme = e.target.checked ? "light" : "dark";
    applyTheme();
    persist();
  });
  document.getElementById("vibrationToggle").addEventListener("change", (e) => {
    state.settings.vibration = e.target.checked;
    persist();
  });
  document.getElementById("animationToggle").addEventListener("change", (e) => {
    state.settings.animations = e.target.checked;
    persist();
  });
  document.getElementById("soundToggle").addEventListener("change", (e) => {
    state.settings.sound = e.target.checked;
    persist();
  });
}

function switchView(viewName) {
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  document.getElementById(`view-${viewName}`).classList.add("active");
  document.querySelectorAll(".nav-btn").forEach((n) => n.classList.toggle("active", n.dataset.view === viewName));
  const title = document.getElementById(`view-${viewName}`).dataset.title || "Quran Tracker";
  document.getElementById("pageTitle").textContent = title;
  if (viewName === "accueil") renderTimeline();
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

  state.history.unshift({
    date: now.toISOString(),
    surahs: state.currentPlan.map((s) => s.numero),
    minutes
  });

  updateStreak(today);
  state.profile.stats.totalSessions += 1;
  state.profile.stats.totalMinutes += minutes;
  state.profile.stats.totalSurahsValidated += newValidated;
  state.progress.readCount = state.readSurahs.length;

  const prestigeAwarded = checkPrestige();
  persist();
  updateAllUI();
  renderDailyReading();
  triggerCompletionFX(prestigeAwarded);
}

function updateStreak(today) {
  const last = state.streak.lastDate;
  if (!last) {
    state.streak.current = 1;
  } else if (last === today) {
    return;
  } else {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const y = yesterday.toISOString().slice(0, 10);
    state.streak.current = last === y ? state.streak.current + 1 : 1;
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
  state.history.unshift({
    date: new Date().toISOString(),
    surahs: [],
    minutes: 0,
    type: "prestige"
  });
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
    row.querySelector("button").addEventListener("click", () => toggleSurahRead(s.numero));
    root.appendChild(row);
  });
}

function toggleSurahRead(numero) {
  const idx = state.readSurahs.indexOf(numero);
  if (idx >= 0) {
    state.readSurahs.splice(idx, 1);
  } else {
    state.readSurahs.push(numero);
    state.history.unshift({ date: new Date().toISOString(), surahs: [numero], minutes: 0, type: "manual" });
  }
  state.progress.readCount = state.readSurahs.length;
  checkPrestige();
  persist();
  updateAllUI();
  onSearchInput({ target: document.getElementById("searchInput") });
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
      const names = entry.surahs.map((n) => {
        const s = surahs[n - 1];
        return `${n} ${s ? s.nomFr : ""}`.trim();
      });
      div.innerHTML = `<div class="muted">${dateLabel}</div><strong>${names.join(" · ") || "Validation manuelle"}</strong>`;
    }
    root.appendChild(div);
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

  if (!state.history.length) {
    document.getElementById("statAvgDay").textContent = "0 min";
  } else {
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
  renderTimeline();
  renderProfileStats();
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
  if (!confirm("Réinitialiser les sourates lues pour ce cycle ?")) return;
  state.readSurahs = [];
  state.progress.readCount = 0;
  persist();
  updateAllUI();
  renderSearchResults(surahs);
  showToast("Progression du cycle réinitialisée.");
}

function hardResetAll() {
  if (!confirm("Effacer toutes les données locales ?")) return;
  STORAGE_KEYS.forEach((k) => localStorage.removeItem(k));
  location.reload();
}

function openSettings() {
  document.getElementById("settingsModal").classList.remove("hidden");
}

function closeSettings() {
  document.getElementById("settingsModal").classList.add("hidden");
}

function exportData() {
  const payload = {};
  STORAGE_KEYS.forEach((k) => (payload[k] = JSON.parse(localStorage.getItem(k) || "null")));
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "quran-tracker-backup.json";
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
      const json = JSON.parse(String(reader.result || "{}"));
      STORAGE_KEYS.forEach((k) => {
        if (Object.prototype.hasOwnProperty.call(json, k)) {
          localStorage.setItem(k, JSON.stringify(json[k]));
        }
      });
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
  if (state.settings.animations) launchConfetti(prestigeAwarded ? 120 : 70);
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
