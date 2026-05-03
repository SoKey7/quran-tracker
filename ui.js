import { getAllNotes, getSurahNotes } from "./notes.js";
import { getValidHistory } from "./history.js";
import { getBadgeCards } from "./badges.js";

let bannerTimer = null;
const bannerQueue = [];
let heatmapTooltipTimer = null;

export function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.remove("hidden");
  toast.classList.add("toast-in");
  setTimeout(() => toast.classList.add("hidden"), 1800);
}

export function showHeatmapTooltip(text) {
  const el = document.getElementById("heatmapTooltip");
  if (!el) return;
  if (heatmapTooltipTimer) clearTimeout(heatmapTooltipTimer);
  el.textContent = text;
  el.classList.remove("hidden");
  const hide = () => {
    el.classList.add("hidden");
    document.removeEventListener("pointerdown", hide);
  };
  document.removeEventListener("pointerdown", hide);
  document.addEventListener("pointerdown", hide, { once: true });
  heatmapTooltipTimer = setTimeout(() => {
    el.classList.add("hidden");
  }, 2500);
}

export function showSaveSuccess() {
  const el = document.getElementById("saveIndicator");
  el.classList.remove("hidden");
  el.classList.add("pulse-save");
  setTimeout(() => {
    el.classList.remove("pulse-save");
    el.classList.add("hidden");
  }, 900);
}

export function showAchievementBanner(title, subtitle, icon = "🏆") {
  bannerQueue.push({ title, subtitle, icon });
  if (!bannerTimer) flushBannerQueue();
}

function flushBannerQueue() {
  if (!bannerQueue.length) {
    bannerTimer = null;
    return;
  }
  const item = bannerQueue.shift();
  const stack = document.getElementById("achievementStack");
  const card = document.createElement("div");
  card.className = "achievement-banner";
  card.innerHTML = `
    <div><strong>${item.icon} ${item.title}</strong><div>${item.subtitle}</div></div>
  `;
  stack.prepend(card);
  bannerTimer = setTimeout(() => {
    card.remove();
    bannerTimer = null;
    flushBannerQueue();
  }, 4000);
}

export function renderTop(data, totalSurahs, weightedProgress) {
  document.getElementById("progressText").textContent = `${data.progress.readCount} / ${totalSurahs}`;
  document.getElementById("progressPercent").textContent = `${weightedProgress.percent}%`;
  document.getElementById("globalProgressFill").style.width = `${weightedProgress.percent}%`;
  document.getElementById("streakLabel").textContent = `🔥 ${data.streak.current} jours`;
  document.getElementById("prestigeBadge").textContent = `⭐ Prestige ${data.prestige}`;
}

export function renderSearchResults(data, surahs, query, actions) {
  const q = query.trim().toLowerCase();
  const list = q ? surahs.filter((s) => `${s.numero}`.includes(q) || s.nomFr.toLowerCase().includes(q)) : surahs;
  const root = document.getElementById("searchResults");
  root.innerHTML = "";
  list.forEach((s) => {
    const isRead = data.progress.readSurahs.includes(s.numero);
    const noteCount = (data.notes[String(s.numero)] || []).length;
    const row = document.createElement("div");
    row.className = "result-item";
    row.innerHTML = `
      <div>
        <strong>${s.numero}. ${s.nomFr}</strong>
        <div class="muted">${s.categorie} ${noteCount ? `• 📝 ${noteCount}` : ""}</div>
      </div>
      <div class="result-actions">
        <button class="secondary-btn action-btn note-mini-btn" title="Ajouter une note" aria-label="Ajouter une note">
          <span class="action-icon">📝</span>
        </button>
        <button class="action-btn ${isRead ? "remove" : ""}" title="${isRead ? "↩️ Retirer lu" : "✅ Marquer comme lu"}" aria-label="${isRead ? "Retirer lu" : "Marquer comme lu"}">
          <span class="action-icon">${isRead ? "↩️" : "✅"}</span><span class="action-label">${isRead ? "Retirer" : "Marquer lu"}</span>
        </button>
      </div>
    `;
    const [noteBtn, markBtn] = row.querySelectorAll("button");
    noteBtn.addEventListener("click", () => actions.onNote(s.numero));
    markBtn.addEventListener("click", () => actions.onToggleRead(s.numero));
    root.appendChild(row);
  });
}

export function renderDailyReading(data, actions) {
  const list = document.getElementById("dailyReadingList");
  const completeBtn = document.getElementById("completeBtn");
  list.innerHTML = "";
  if (!data.currentPlan.length) {
    list.innerHTML = '<li class="muted">Aucune lecture générée.</li>';
    completeBtn.disabled = true;
    return;
  }
  data.currentPlan.forEach((s) => {
    const li = document.createElement("li");
    const noteCount = (data.notes[String(s.numero)] || []).length;
    li.innerHTML = `
      <div class="reading-row">
        <div>
          <strong>${s.numero}. ${s.nomFr}</strong><br><span class="muted">${s.categorie} ${noteCount ? `• 📝 ${noteCount}` : ""}</span>
        </div>
        <button class="secondary-btn action-btn note-mini-btn" title="📝 Ajouter une note" aria-label="Ajouter une note">
          <span class="action-icon">📝</span>
        </button>
      </div>
    `;
    li.querySelector("button").addEventListener("click", () => actions.onNote(s.numero));
    list.appendChild(li);
  });
  completeBtn.disabled = false;
}

export function renderHistory(data, surahsById) {
  const root = document.getElementById("timeline");
  root.innerHTML = "";
  const valid = getValidHistory(data).slice(0, 60);
  if (!valid.length) {
    root.innerHTML = '<p class="muted">Aucun historique valide.</p>';
    return;
  }
  valid.forEach((entry) => {
    const div = document.createElement("div");
    div.className = "timeline-item";
    const date = new Date(entry.date).toLocaleDateString("fr-FR");
    const surahName = surahsById.get(entry.surahId)?.nomFr || entry.surahName;
    const actionLabel = entry.action === "read" ? "✅ Lu" : "↩️ Retire";
    div.innerHTML = `<div class="muted">${date}</div><strong>${actionLabel} • ${entry.surahId}. ${surahName}</strong>`;
    root.appendChild(div);
  });
}

export function renderProfile(data, totalSurahs, weightedProgress, weightedLabel) {
  document.getElementById("profileProgressText").textContent = `${data.progress.readCount} / ${totalSurahs}`;
  document.getElementById("profileProgressPercent").textContent = weightedLabel || `${weightedProgress.percent}%`;
  document.getElementById("statTotalTime").textContent = `${data.profile.stats.totalMinutes} min`;
  document.getElementById("statSessions").textContent = `${data.profile.stats.totalSessions}`;
  document.getElementById("statAvgDay").textContent = `${Math.round((data.profile.stats.totalMinutes || 0) / Math.max(data.streak.current, 1))} min`;
  document.getElementById("statStreak").textContent = `${data.streak.current}`;
  document.getElementById("statLastRead").textContent = data.history[0] ? new Date(data.history[0].date).toLocaleDateString("fr-FR") : "Aucune";
  document.getElementById("statPrestige").textContent = `Prestige ${data.prestige}`;
  document.getElementById("statCycles").textContent = `${data.progress.cyclesCompleted}`;
}

export function renderProfileWidgets(data, weightedProgress, actions = {}) {
  const root = document.getElementById("profileWidgetsRoot");
  if (!root) return;
  let source = data;
  try {
    const raw = localStorage.getItem("quranTrackerData");
    if (raw) source = JSON.parse(raw);
  } catch {
    source = data;
  }
  const streakValue = Number(source?.streak?.current ?? source?.streak ?? data.streak.current ?? 0);
  const readCount = Number(source?.progress?.readCount ?? data.progress.readCount ?? 0);
  const total = Number(source?.progress?.total ?? 114);
  const percent = Math.round((readCount / Math.max(total, 1)) * 100);
  const today = new Date().toISOString().slice(0, 10);
  const readToday = Array.isArray(source?.history) && source.history.some((h) => String(h.date || "").slice(0, 10) === today && h.valid !== false && h.action !== "unread");
  root.innerHTML = "";

  const streakCard = document.createElement("div");
  streakCard.className = "profile-widget-card";
  streakCard.innerHTML = `
    <div class="profile-widget-label">Série en cours</div>
    <div style="font-weight:800; font-size:22px;">🔥 ${streakValue} jours</div>
    <div class="profile-widget-sub">${streakValue > 0 ? "Série en cours" : "Commence aujourd'hui !"}</div>
  `;

  const progCard = document.createElement("div");
  progCard.className = "profile-widget-card";
  progCard.innerHTML = `
    <div class="profile-widget-label">Progression</div>
    <div style="font-weight:800; font-size:22px;">${readCount} / ${total}</div>
    <div class="profile-widget-bar"><div class="profile-widget-bar-fill" style="width:${percent}%;"></div></div>
    <div class="profile-widget-sub">${percent}% du Coran</div>
  `;

  const ctaCard = document.createElement("button");
  ctaCard.type = "button";
  ctaCard.className = "profile-widget-card";
  ctaCard.style.border = "none";
  ctaCard.style.textAlign = "left";
  ctaCard.innerHTML = `
    <div class="profile-widget-label">Action</div>
    <div style="font-weight:800; font-size:18px;">▶ Commencer</div>
    <div class="profile-widget-sub">${readToday ? "✅ Déjà lu aujourd'hui" : `🔥 ${streakValue} jours de série`}</div>
  `;
  ctaCard.addEventListener("click", () => actions.onStartReading?.());

  root.appendChild(streakCard);
  root.appendChild(progCard);
  root.appendChild(ctaCard);
}

export function renderWidgets(widgetSpecs, actions = {}) {
  const root = document.getElementById("widgetsRoot");
  if (!root) return;
  root.innerHTML = "";
  widgetSpecs.forEach((w) => {
    const card = document.createElement("div");
    card.className = "widget-card";
    card.innerHTML = `<h4>${w.title}</h4><div class="widget-value">${w.value}</div>`;
    if (w.actionLabel) {
      const button = document.createElement("button");
      button.className = "widget-action";
      button.textContent = w.actionLabel;
      button.addEventListener("click", () => actions.onAction?.(w.id));
      card.appendChild(button);
    }
    root.appendChild(card);
  });
}

export function renderFriends(friends, actions = {}) {
  const root = document.getElementById("friendsRoot");
  if (!root) return;
  root.innerHTML = "";
  if (!friends.length) {
    root.innerHTML = '<p class="muted">Ajoute des amis pour voir leur progression 👥</p>';
    return;
  }
  friends.forEach((friend) => {
    const card = document.createElement("div");
    card.className = "friend-card";
    card.innerHTML = `
      <strong>${friend.pseudo}</strong>
      <div class="muted">🔥 ${friend.streak} jours</div>
      <div class="muted">${friend.progressPercent}%</div>
      <div class="muted">Prestige ${friend.prestige}</div>
      <div class="muted">Activite: ${new Date(friend.lastActivityAt).toLocaleDateString("fr-FR")}</div>
    `;
    const encourageBtn = document.createElement("button");
    encourageBtn.className = "secondary-btn";
    encourageBtn.textContent = "Encourager";
    encourageBtn.disabled = !actions.canEncourage?.(friend.id);
    encourageBtn.addEventListener("click", () => actions.onEncourage?.(friend.id));
    card.appendChild(encourageBtn);
    root.appendChild(card);
  });
}

export function renderFriendRequests(requests, actions = {}) {
  const root = document.getElementById("friendRequestsRoot");
  if (!root) return;
  root.innerHTML = "";
  if (!requests.length) return;
  requests.forEach((req) => {
    const card = document.createElement("div");
    card.className = "friend-card";
    card.innerHTML = `<strong>${req.fromPseudo || req.from || "Demande"}</strong><div class="muted">Demande d'ami reçue</div>`;
    const actionsWrap = document.createElement("div");
    actionsWrap.className = "result-actions";
    const accept = document.createElement("button");
    accept.className = "secondary-btn";
    accept.textContent = "Accepter";
    accept.addEventListener("click", () => actions.onAccept?.(req));
    const reject = document.createElement("button");
    reject.className = "secondary-btn";
    reject.textContent = "Refuser";
    reject.addEventListener("click", () => actions.onReject?.(req));
    actionsWrap.appendChild(accept);
    actionsWrap.appendChild(reject);
    card.appendChild(actionsWrap);
    root.appendChild(card);
  });
}

export function renderBadges(data) {
  const root = document.getElementById("badgesRoot");
  root.innerHTML = "";
  getBadgeCards(data).forEach((b) => {
    const card = document.createElement("div");
    card.className = `badge-card ${b.unlocked ? "" : "locked"}`.trim();
    card.innerHTML = `<h4>${b.unlocked ? b.icon : "🔒"} ${b.title}</h4><div class="muted">${b.subtitle}</div>`;
    root.appendChild(card);
  });
}

export function renderAllNotes(data, surahsById, sort) {
  const root = document.getElementById("allNotesList");
  const notes = getAllNotes(data, sort);
  root.innerHTML = "";
  if (!notes.length) {
    root.innerHTML = '<p class="muted">Aucune note pour le moment.</p>';
    return;
  }
  notes.forEach((note) => {
    const div = document.createElement("div");
    div.className = "note-item";
    const name = surahsById.get(note.surahId)?.nomFr || `Sourate ${note.surahId}`;
    div.innerHTML = `<strong>${note.surahId}. ${name}</strong><div>${note.text}</div><div class="muted">${new Date(note.createdAt).toLocaleString("fr-FR")} ${note.favorite ? "• ⭐ Favori" : ""}</div>`;
    root.appendChild(div);
  });
}

export function openNotesModal(surah, data, handlers) {
  document.getElementById("notesModalTitle").textContent = `Notes • ${surah.numero}. ${surah.nomFr}`;
  document.getElementById("noteInput").value = "";
  document.getElementById("noteFavoriteToggle").checked = false;
  document.getElementById("notesModal").classList.remove("hidden");
  renderSurahNotesList(data, surah.numero, handlers);
}

export function closeNotesModal() {
  document.getElementById("notesModal").classList.add("hidden");
}

export function renderSurahNotesList(data, surahId, handlers) {
  const root = document.getElementById("surahNotesList");
  root.innerHTML = "";
  const notes = getSurahNotes(data, surahId);
  if (!notes.length) {
    root.innerHTML = '<p class="muted">Aucune note sur cette sourate.</p>';
    return;
  }
  notes.forEach((note) => {
    const row = document.createElement("div");
    row.className = "note-item";
    row.innerHTML = `
      <div>${note.text}</div>
      <div class="muted">${new Date(note.createdAt).toLocaleString("fr-FR")} ${note.favorite ? "• ⭐ Favori" : ""}</div>
      <div class="result-actions">
        <button class="secondary-btn action-btn" title="Modifier la note" aria-label="Modifier la note"><span class="action-icon">✏️</span><span class="action-label">Modifier</span></button>
        <button class="danger-btn action-btn" title="🗑️ Supprimer la note" aria-label="Supprimer la note"><span class="action-icon">🗑️</span><span class="action-label">Supprimer</span></button>
      </div>
    `;
    const [editBtn, delBtn] = row.querySelectorAll("button");
    editBtn.addEventListener("click", () => handlers.onEdit(note));
    delBtn.addEventListener("click", () => handlers.onDelete(note.id));
    root.appendChild(row);
  });
}

export function renderMonthlyHeatmap(data, rootId, onCellClick) {
  const root = document.getElementById(rootId);
  if (!root) return;
  root.innerHTML = "";
  const map = new Map();
  getValidHistory(data).forEach((entry) => {
    if (entry.action !== "read") return;
    const day = String(entry.date).slice(0, 10);
    map.set(day, (map.get(day) || 0) + 1);
  });
  const now = new Date();
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  for (let d = 1; d <= days; d++) {
    const date = new Date(now.getFullYear(), now.getMonth(), d);
    const key = date.toISOString().slice(0, 10);
    const count = map.get(key) || 0;
    const level = count >= 5 ? 4 : count >= 3 ? 3 : count >= 1 ? 2 : 0;
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "heatmap-cell";
    cell.dataset.level = String(level);
    cell.title = `${date.toLocaleDateString("fr-FR")} • ${count} lecture(s)`;
    cell.addEventListener("click", () => onCellClick(`${date.toLocaleDateString("fr-FR")}\n${count} lecture${count > 1 ? "s" : ""}`));
    root.appendChild(cell);
  }
}
