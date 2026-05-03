import { isFirebaseConfigured } from "./firebase-config.js";

function getCtx() {
  if (!isFirebaseConfigured()) return null;
  if (!window.firebase || !window.auth || !window.db) return null;
  return { firebase: window.firebase, auth: window.auth, db: window.db };
}

export function watchAuth(callback) {
  const ctx = getCtx();
  if (!ctx) return () => {};
  return ctx.auth.onAuthStateChanged(callback);
}

export async function signUp(pseudo, email, password) {
  const ctx = getCtx();
  if (!ctx) throw new Error("Firebase non configuré");
  const cred = await ctx.auth.createUserWithEmailAndPassword(email, password);
  await ctx.db.collection("users").doc(cred.user.uid).set({
    uid: cred.user.uid,
    pseudo,
    email,
    streak: 0,
    progress: 0,
    prestige: 0,
    joinedAt: ctx.firebase.firestore.FieldValue.serverTimestamp(),
    friends: []
  }, { merge: true });
  return cred.user;
}

export async function signIn(email, password) {
  const ctx = getCtx();
  if (!ctx) throw new Error("Firebase non configuré");
  const cred = await ctx.auth.signInWithEmailAndPassword(email, password);
  return cred.user;
}

export async function syncUserStats(uid, stats) {
  const ctx = getCtx();
  if (!ctx) return;
  await ctx.db.collection("users").doc(uid).set(stats, { merge: true });
}

export async function searchUsersByPseudoOrEmail(term, selfUid) {
  const ctx = getCtx();
  if (!ctx) return [];
  const users = [];
  const byPseudo = await ctx.db.collection("users").where("pseudo", "==", term).get();
  byPseudo.forEach((d) => {
    if (d.id !== selfUid) users.push(d.data());
  });
  if (users.length) return users;
  const byEmail = await ctx.db.collection("users").where("email", "==", term).get();
  byEmail.forEach((d) => {
    if (d.id !== selfUid) users.push(d.data());
  });
  return users;
}

export async function sendFriendRequest(fromUid, toUid) {
  const ctx = getCtx();
  if (!ctx) return;
  const fromDoc = await ctx.db.collection("users").doc(fromUid).get();
  const fromPseudo = fromDoc.exists ? fromDoc.data().pseudo : "Utilisateur";
  await ctx.db.collection("friendRequests").add({
    from: fromUid,
    fromPseudo,
    to: toUid,
    status: "pending",
    createdAt: ctx.firebase.firestore.FieldValue.serverTimestamp()
  });
}

export async function getIncomingFriendRequests(uid) {
  const ctx = getCtx();
  if (!ctx) return [];
  const snap = await ctx.db.collection("friendRequests").where("to", "==", uid).where("status", "==", "pending").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function respondToFriendRequest(requestId, fromUid, toUid, accept) {
  const ctx = getCtx();
  if (!ctx) return;
  await ctx.db.collection("friendRequests").doc(requestId).update({ status: accept ? "accepted" : "rejected" });
  if (accept) {
    await Promise.all([
      ctx.db.collection("users").doc(fromUid).update({ friends: ctx.firebase.firestore.FieldValue.arrayUnion(toUid) }),
      ctx.db.collection("users").doc(toUid).update({ friends: ctx.firebase.firestore.FieldValue.arrayUnion(fromUid) })
    ]);
  }
}

export async function getFriends(uid) {
  const ctx = getCtx();
  if (!ctx) return [];
  const me = await ctx.db.collection("users").doc(uid).get();
  if (!me.exists()) return [];
  const ids = Array.isArray(me.data().friends) ? me.data().friends : [];
  const docs = await Promise.all(ids.map((id) => ctx.db.collection("users").doc(id).get()));
  return docs.filter((d) => d.exists()).map((d) => d.data()).sort((a, b) => (b.streak || 0) - (a.streak || 0));
}
