/** Dev traces: définir localStorage.qtDebug === "1" pour activer. */
export const DEV =
  typeof window !== "undefined" && typeof window.localStorage?.getItem === "function"
    ? window.localStorage.getItem("qtDebug") === "1"
    : false;

export function devLog(...args) {
  if (DEV) console.log("[QuranTracker]", ...args);
}

export function debounce(fn, waitMs = 120) {
  let t = null;
  return (...args) => {
    window.clearTimeout(t);
    t = window.setTimeout(() => fn(...args), waitMs);
  };
}

/** Date ISO ou objet Date → chaîne française lisible */
export function formatDate(value, opts = {}) {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", opts);
}

/** Date/heure française (notes, liste) */
export function formatDateTime(value, opts = {}) {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("fr-FR", opts);
}

/** Toast léger (#toast dans le DOM) */
export function showToast(msg) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.remove("hidden");
  toast.classList.add("toast-in");
  window.setTimeout(() => toast.classList.add("hidden"), 1800);
}

/** Ouverture / fermeture modales utilisant la classe `.hidden` (backdrop plein écran). */
export function openModal(elementId, { display = "" } = {}) {
  const el = document.getElementById(elementId);
  if (!el) return null;
  el.classList.remove("hidden");
  if (display !== undefined && el.style) el.style.display = display;
  return el;
}

export function closeModal(elementId, { restoreDisplay } = {}) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.classList.add("hidden");
  if (restoreDisplay !== undefined && el.style) el.style.display = restoreDisplay;
}

/** Persistance métier canonique — alias pour un point d’entrée unique depuis l’UI. */
export { loadAppData as loadData, saveAppData as saveData } from "./storage.js";
