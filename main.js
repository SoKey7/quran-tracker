import { clearAll, loadAppData, saveAppData, TOTAL_SURAHS, validateData } from "./storage.js";
import { addNote, deleteNote, updateNote } from "./notes.js";
import { evaluateBadges } from "./badges.js";
import { markSurahAsRead, markSurahAsUnread } from "./history.js";
import { buildReadingPlan, computeWeightedProgress } from "./reading.js";
import { formatWeightedLabel } from "./profile.js";
import { getHomeWidgets } from "./widgets.js";
import { createFriendsService } from "./friends.js";
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
  pendingMarkSurahId: null
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
  render();
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

function generateDailyReading() {
  const unread = surahs.filter((s) => !state.data.progress.readSurahs.includes(s.numero));
  if (!unread.length) {
    const prestige = maybePrestige();
    if (prestige) {
      persist();
      render();
    } else {
      showToast("Toutes les sourates sont lues pour ce cycle.");
    }
    return;
  }
  const list = document.getElementById("dailyReadingList");
  list.innerHTML = '<li class="skeleton-line"></li><li class="skeleton-line"></li>';
  setTimeout(() => {
    state.currentPlan = buildReadingPlan(unread, getSelectedMinutes(), console);
    renderDailyReading(state, { onNote: openNoteModal });
    showToast("Lecture du jour generee.");
  }, 220);
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
  document.getElementById("markCustomDateInput").value = "";
  document.getElementById("markDateModal").classList.remove("hidden");
}

function closeMarkDateModal() {
  state.pendingMarkSurahId = null;
  document.getElementById("markDateModal").classList.add("hidden");
}

function resolveMarkDate() {
  const choice = document.querySelector("input[name='markDateChoice']:checked")?.value || "today";
  const now = new Date();
  if (choice === "today") return now;
  if (choice === "yesterday") {
    now.setDate(now.getDate() - 1);
    return now;
  }
  const custom = document.getElementById("markCustomDateInput").value;
  const customDate = custom ? new Date(`${custom}T12:00:00`) : now;
  return Number.isNaN(customDate.getTime()) ? now : customDate;
}

function confirmMarkDate() {
  const surahId = state.pendingMarkSurahId;
  if (!surahId) return;
  const surah = surahMap.get(surahId);
  const iso = resolveMarkDate().toISOString();
  markSurahAsRead(state.data, surahId, surah.nomFr, iso);
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
  renderMonthlyHeatmap(state.data, "heatmapRoot", showToast);
  renderMonthlyHeatmap(state.data, "heatmapProfileRoot", showToast);
  renderAllNotes(state.data, surahMap, document.getElementById("notesSortSelect").value || "recent");
  document.body.classList.toggle("light", state.data.settings.theme === "light");
  document.getElementById("themeToggle").checked = state.data.settings.theme === "light";
  document.getElementById("vibrationToggle").checked = !!state.data.settings.vibration;
  document.getElementById("animationToggle").checked = !!state.data.settings.animations;
  document.getElementById("soundToggle").checked = !!state.data.settings.sound;
  document.getElementById("notificationsToggle").checked = !!state.data.settings.notifications.enabled;
  document.getElementById("notificationTimeInput").value = state.data.settings.notifications.time || "20:00";
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
  document.getElementById("generateBtn").addEventListener("click", generateDailyReading);
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
  document.getElementById("closeMarkDateBtn").addEventListener("click", closeMarkDateModal);
  document.getElementById("cancelMarkDateBtn").addEventListener("click", closeMarkDateModal);
  document.getElementById("confirmMarkDateBtn").addEventListener("click", confirmMarkDate);
  document.getElementById("addFriendBtn").addEventListener("click", () => {
    showConfirm("Ajouter un ami mock (pseudo/code) ?").then(async (ok) => {
      if (!ok) return;
      const name = prompt("Pseudo ou code ami");
      if (!name) return;
      friendsService.addFriend(name);
      showToast("Ami ajoute.");
      render();
    });
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
  document.getElementById("manualResetBtn").addEventListener("click", runFullReset);
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
try {
  const raw = localStorage.getItem("quranTrackerData");
  if (raw) JSON.parse(raw);
} catch {
  showToast("Donnees restaurees depuis la sauvegarde");
}
