export function addHistoryEvent(data, event) {
  data.history.unshift({
    surahId: Number(event.surahId),
    surahName: String(event.surahName || `Sourate ${event.surahId}`),
    action: event.action === "unread" ? "unread" : "read",
    date: String(event.date || new Date().toISOString()),
    valid: event.valid !== false
  });
}

export function markSurahAsRead(data, surahId, surahName, isoDate = new Date().toISOString()) {
  if (!data.progress.readSurahs.includes(surahId)) {
    data.progress.readSurahs.push(surahId);
  }
  data.progress.readSurahs.sort((a, b) => a - b);
  data.progress.readCount = data.progress.readSurahs.length;
  addHistoryEvent(data, { surahId, surahName, action: "read", date: isoDate, valid: true });
}

export function markSurahAsUnread(data, surahId, surahName, isoDate = new Date().toISOString()) {
  data.progress.readSurahs = data.progress.readSurahs.filter((id) => id !== surahId);
  data.progress.readCount = data.progress.readSurahs.length;
  data.history.forEach((entry) => {
    if (entry.surahId === surahId && entry.action === "read" && entry.valid) {
      entry.valid = false;
    }
  });
  addHistoryEvent(data, { surahId, surahName, action: "unread", date: isoDate, valid: true });
}

export function getValidHistory(data) {
  return data.history.filter((h) => h.valid);
}
