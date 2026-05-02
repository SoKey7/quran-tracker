import { getAllNotes, getSurahNotes } from "./notes.js";
import { getValidHistory } from "./history.js";
import { getBadgeCards } from "./badges.js";

let bannerTimer = null;
const bannerQueue = [];

export function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 1800);
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
    <div><strong>${item.icon} ${item.title}</strong><div class="muted">${item.subtitle}</div></div>
    <button class="icon-btn achievement-close" aria-label="Fermer">✕</button>
  `;
  card.querySelector(".achievement-close").addEventListener("click", () => card.remove());
  stack.prepend(card);
  bannerTimer = setTimeout(() => {
    card.remove();
    bannerTimer = null;
    flushBannerQueue();
  }, 4000);
}

export function renderTop(data, totalSurahs) {
  const percent = Math.round((data.progress.readCount / totalSurahs) * 100);
  document.getElementById("progressText").textContent = `${data.progress.readCount} / ${totalSurahs}`;
  document.getElementById("progressPercent").textContent = `${percent}%`;
  document.getElementById("globalProgressFill").style.width = `${percent}%`;
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
        <button class="secondary-btn note-mini-btn">📝 Ajouter une note</button>
        <button class="${isRead ? "remove" : ""}">${isRead ? "Retirer" : "Marquer lue"}</button>
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
        <button class="secondary-btn note-mini-btn">📝 Ajouter une note</button>
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

export function renderProfile(data, totalSurahs) {
  const percent = Math.round((data.progress.readCount / totalSurahs) * 100);
  document.getElementById("profileProgressText").textContent = `${data.progress.readCount} / ${totalSurahs}`;
  document.getElementById("profileProgressPercent").textContent = `${percent}%`;
  document.getElementById("statTotalTime").textContent = `${data.profile.stats.totalMinutes} min`;
  document.getElementById("statSessions").textContent = `${data.profile.stats.totalSessions}`;
  document.getElementById("statAvgDay").textContent = `${Math.round((data.profile.stats.totalMinutes || 0) / Math.max(data.streak.current, 1))} min`;
  document.getElementById("statStreak").textContent = `${data.streak.current}`;
  document.getElementById("statLastRead").textContent = data.history[0] ? new Date(data.history[0].date).toLocaleDateString("fr-FR") : "Aucune";
  document.getElementById("statPrestige").textContent = `Prestige ${data.prestige}`;
  document.getElementById("statCycles").textContent = `${data.progress.cyclesCompleted}`;
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
        <button class="secondary-btn">Modifier</button>
        <button class="danger-btn">Supprimer</button>
      </div>
    `;
    const [editBtn, delBtn] = row.querySelectorAll("button");
    editBtn.addEventListener("click", () => handlers.onEdit(note));
    delBtn.addEventListener("click", () => handlers.onDelete(note.id));
    root.appendChild(row);
  });
}
