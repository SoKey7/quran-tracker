function ensureBucket(data, surahId) {
  const key = String(surahId);
  if (!Array.isArray(data.notes[key])) data.notes[key] = [];
  return data.notes[key];
}

export function getSurahNotes(data, surahId) {
  return ensureBucket(data, surahId).slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function addNote(data, surahId, text, favorite = false) {
  const bucket = ensureBucket(data, surahId);
  bucket.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    text: text.trim(),
    createdAt: new Date().toISOString(),
    favorite: !!favorite
  });
}

export function updateNote(data, surahId, noteId, text, favorite) {
  const bucket = ensureBucket(data, surahId);
  const note = bucket.find((n) => n.id === noteId);
  if (!note) return false;
  note.text = text.trim();
  note.favorite = !!favorite;
  return true;
}

export function deleteNote(data, surahId, noteId) {
  const bucket = ensureBucket(data, surahId);
  const next = bucket.filter((n) => n.id !== noteId);
  data.notes[String(surahId)] = next;
}

export function getAllNotes(data, sort = "recent") {
  const all = [];
  Object.keys(data.notes || {}).forEach((surahId) => {
    (data.notes[surahId] || []).forEach((note) => all.push({ ...note, surahId: Number(surahId) }));
  });
  if (sort === "favorites") return all.filter((n) => n.favorite).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (sort === "surah") return all.sort((a, b) => a.surahId - b.surahId || new Date(b.createdAt) - new Date(a.createdAt));
  return all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
