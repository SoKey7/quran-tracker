import { clearAll, loadAppData, saveAppData, TOTAL_SURAHS, validateData } from "./storage.js";
import { addNote, deleteNote, updateNote } from "./notes.js";
import { evaluateBadges } from "./badges.js";
import { markSurahAsRead, markSurahAsUnread } from "./history.js";
import { computeWeightedProgress, displayReading, generateReading } from "./reading.js";
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
import { surahs, surahMap } from "./surahs.js";
import { debounce, devLog } from "./utils.js";

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
  document.getElementById(`view-${viewName}`)?.classList.add("active");
  document.querySelectorAll(".nav-btn").forEach((n) => n.classList.toggle("active", n.dataset.view === viewName));
  document.getElementById("pageTitleText").textContent =
    document.getElementById(`view-${viewName}`)?.dataset.title || "Quran Tracker";
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

function generateDailyReading() {
  const list = document.getElementById("dailyReadingList");
  if (!list) return;
  list.innerHTML = '<li class="skeleton-line"></li><li class="skeleton-line"></li>';

  const minutes = getSelectedMinutes();
  devLog("[BTN] Génération lecture, minutes:", minutes);

  const result = generateReading(minutes, state.data);
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
  window.setTimeout(() => {
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
  state.data.progress.surahMeta =
    state.data.progress.surahMeta && typeof state.data.progress.surahMeta === "object" ? state.data.progress.surahMeta : {};
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

function renderFull() {
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
      renderFull();
    }
  });
  renderBadges(state.data);
  renderMonthlyHeatmap(state.data, "heatmapRoot", showHeatmapTooltip);
  renderMonthlyHeatmap(state.data, "heatmapProfileRoot", showHeatmapTooltip);
  const sortSel = document.getElementById("notesSortSelect");
  renderAllNotes(state.data, surahMap, sortSel?.value || "recent");
  document.body.classList.toggle("light", state.data.settings.theme === "light");
  document.getElementById("themeToggle").checked = state.data.settings.theme === "light";
  document.getElementById("vibrationToggle").checked = !!state.data.settings.vibration;
  document.getElementById("animationToggle").checked = !!state.data.settings.animations;
  document.getElementById("soundToggle").checked = !!state.data.settings.sound;
  document.getElementById("notificationsToggle").checked = !!state.data.settings.notifications.enabled;
  document.getElementById("notificationTimeInput").value = state.data.settings.notifications.time || "20:00";
}

const renderDebounced = debounce(renderFull, 100);

function render() {
  renderFull();
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
    el.addEventListener(
      "touchend",
      (e) => {
        touched = true;
        e.preventDefault();
        handler(e);
      },
      { passive: false }
    );
    el.addEventListener("click", (e) => {
      if (touched) {
        touched = false;
        return;
      }
      handler(e);
    });
  };

  document.querySelectorAll(".nav-btn").forEach((btn) =>
    btn.addEventListener("click", () => switchView(btn.dataset.view))
  );

  document.querySelectorAll(".time-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".time-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  const searchEl = document.getElementById("searchInput");
  searchEl.addEventListener("input", (e) => {
    state.query = e.target.value || "";
    renderDebounced();
  });

  const btnGen = document.getElementById("generateBtn");
  if (btnGen?.parentNode) {
    const newBtn = btnGen.cloneNode(true);
    btnGen.parentNode.replaceChild(newBtn, btnGen);
    ["click", "touchend"].forEach((evt) => {
      newBtn.addEventListener(
        evt,
        function onGen(e) {
          e.preventDefault();
          e.stopPropagation();
          generateDailyReading();
        },
        { passive: false }
      );
    });
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

  document.getElementById("settingsOpenBtn").addEventListener("click", () =>
    document.getElementById("settingsModal").classList.remove("hidden")
  );
  document.getElementById("closeSettingsBtn").addEventListener("click", () =>
    document.getElementById("settingsModal").classList.add("hidden")
  );

  addTapListener(document.getElementById("closeMarkDateBtn"), closeMarkDateModal);
  addTapListener(document.getElementById("cancelMarkDateBtn"), closeMarkDateModal);
  addTapListener(document.getElementById("confirmMarkDateBtn"), confirmMarkDate);

  document.getElementById("addFriendBtn")?.addEventListener("click", openFriendsModal);
  document.getElementById("closeFriendsModalBtn")?.addEventListener("click", closeFriendsModal);
  document.getElementById("closeFriendsModalBtn")?.setAttribute("aria-label", "Fermer la fenêtre amis");

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
      btn.type = "button";
      btn.className = "secondary-btn";
      btn.textContent = "Ajouter";
      btn.setAttribute("aria-label", `Ajouter ${user.pseudo || user.email} en ami`);
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
  if (!root) return;
  const colors = ["#18a06a", "#d8b971", "#f7f4eb", "#46dca1"];
  for (let i = 0; i < count; i++) {
    const el = document.createElement("span");
    el.className = "confetti";
    el.style.left = `${Math.random() * 100}vw`;
    el.style.background = colors[Math.floor(Math.random() * colors.length)];
    el.style.animationDuration = `${1000 + Math.random() * 1000}ms`;
    root.appendChild(el);
    window.setTimeout(() => el.remove(), 2200);
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
