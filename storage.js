const STORAGE_KEY = "quranTrackerData";
const STORAGE_TEMP_KEY = "quranTrackerData_tmp";
const LEGACY_ROOT_KEY = "quranTrackerStore";
const LEGACY_KEYS = ["profile", "progress", "readSurahs", "history", "prestige", "streak", "settings"];
const APP_KEYS = [STORAGE_KEY, STORAGE_TEMP_KEY, LEGACY_ROOT_KEY, ...LEGACY_KEYS];
const DATA_VERSION = 3;
const TOTAL_SURAHS = 114;

function safeParse(raw, fallback = null) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function normalizeArrayOfInts(values) {
  if (!Array.isArray(values)) return [];
  return Array.from(new Set(values.filter((v) => Number.isInteger(v) && v > 0 && v <= TOTAL_SURAHS)));
}

function createDefaultData() {
  return {
    version: DATA_VERSION,
    profile: { avatar: null, stats: { totalSessions: 0, totalMinutes: 0, totalSurahsValidated: 0 } },
    progress: { total: TOTAL_SURAHS, readSurahs: [], readCount: 0, cyclesCompleted: 0 },
    history: [],
    notes: {},
    badges: { unlocked: [], favorites: [] },
    settings: {
      theme: "dark",
      vibration: true,
      animations: true,
      sound: false,
      notifications: { enabled: false, time: "20:00", lastSentDate: null }
    },
    streak: { current: 0, max: 0, lastDate: null },
    prestige: 0,
    friends: {
      profileCode: `QTR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      list: [],
      encouragements: {}
    }
  };
}

function migrateHistory(historyInput) {
  if (!Array.isArray(historyInput)) return [];
  const migrated = [];
  historyInput.forEach((entry) => {
    if (!entry || typeof entry !== "object") return;
    if (entry.surahId && entry.action) {
      migrated.push({
        surahId: Number(entry.surahId),
        surahName: String(entry.surahName || `Sourate ${entry.surahId}`),
        action: entry.action === "unread" ? "unread" : "read",
        date: String(entry.date || new Date().toISOString()),
        valid: entry.valid !== false
      });
      return;
    }
    if (Array.isArray(entry.surahs)) {
      entry.surahs.forEach((id) => {
        if (!Number.isInteger(id)) return;
        migrated.push({
          surahId: id,
          surahName: `Sourate ${id}`,
          action: "read",
          date: String(entry.date || new Date().toISOString()),
          valid: true
        });
      });
    }
  });
  return migrated;
}

export function migrateData(input) {
  const defaults = createDefaultData();
  const data = input && typeof input === "object" ? input : {};
  const legacyReadSurahs = normalizeArrayOfInts(data.readSurahs);
  const progressReadSurahs = normalizeArrayOfInts(data.progress?.readSurahs);
  const finalReadSurahs = progressReadSurahs.length ? progressReadSurahs : legacyReadSurahs;
  const merged = {
    ...defaults,
    ...data,
    profile: { ...defaults.profile, ...(data.profile || {}) },
    progress: { ...defaults.progress, ...(data.progress || {}) },
    badges: { ...defaults.badges, ...(data.badges || {}) },
    settings: {
      ...defaults.settings,
      ...(data.settings || {}),
      notifications: { ...defaults.settings.notifications, ...(data.settings?.notifications || {}) }
    },
    streak: { ...defaults.streak, ...(data.streak || {}) }
  };

  merged.version = DATA_VERSION;
  merged.progress.total = TOTAL_SURAHS;
  merged.progress.readSurahs = finalReadSurahs;
  merged.progress.readCount = finalReadSurahs.length;
  merged.history = migrateHistory(merged.history);
  merged.badges.unlocked = Array.isArray(merged.badges.unlocked) ? merged.badges.unlocked : [];
  merged.badges.favorites = Array.isArray(merged.badges.favorites) ? merged.badges.favorites : [];
  merged.notes = merged.notes && typeof merged.notes === "object" ? merged.notes : {};
  merged.friends = merged.friends && typeof merged.friends === "object" ? merged.friends : defaults.friends;
  merged.friends.profileCode = typeof merged.friends.profileCode === "string" && merged.friends.profileCode
    ? merged.friends.profileCode
    : defaults.friends.profileCode;
  merged.friends.list = Array.isArray(merged.friends.list) ? merged.friends.list : [];
  merged.friends.encouragements = merged.friends.encouragements && typeof merged.friends.encouragements === "object"
    ? merged.friends.encouragements
    : {};
  Object.keys(merged.notes).forEach((k) => {
    const arr = Array.isArray(merged.notes[k]) ? merged.notes[k] : [];
    merged.notes[k] = arr
      .filter((n) => n && typeof n === "object" && typeof n.text === "string")
      .map((n) => ({
        id: String(n.id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
        text: n.text.trim(),
        createdAt: String(n.createdAt || new Date().toISOString()),
        favorite: !!n.favorite
      }));
  });
  return merged;
}

export function validateData(data) {
  return migrateData(data);
}

function loadLegacySeed() {
  const fromRoot = safeParse(localStorage.getItem(LEGACY_ROOT_KEY), null);
  if (fromRoot && typeof fromRoot === "object") return fromRoot;
  const raw = {};
  let hasAny = false;
  LEGACY_KEYS.forEach((k) => {
    const parsed = safeParse(localStorage.getItem(k), null);
    if (parsed !== null) hasAny = true;
    raw[k] = parsed;
  });
  return hasAny ? raw : null;
}

export function loadAppData() {
  const current = loadData(STORAGE_KEY, null);
  if (current) return validateData(current);
  const tmp = loadData(STORAGE_TEMP_KEY, null);
  if (tmp) return validateData(tmp);
  const legacy = loadLegacySeed();
  return validateData(legacy);
}

export function saveAppData(data) {
  const safe = validateData(data);
  const payload = JSON.stringify(safe);
  saveData(STORAGE_TEMP_KEY, safe);
  localStorage.setItem(STORAGE_KEY, payload);
  localStorage.removeItem(STORAGE_TEMP_KEY);
  return safe;
}

export function saveData(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadData(key, defaultValue = null) {
  return safeParse(localStorage.getItem(key), defaultValue);
}

export function clearAll() {
  APP_KEYS.forEach((k) => localStorage.removeItem(k));
}

export function migrate() {
  return loadAppData();
}

export { DATA_VERSION, TOTAL_SURAHS };
