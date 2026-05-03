import { firebaseConfig, isFirebaseConfigured } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  updateDoc,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let app = null;
let auth = null;
let db = null;

export function initFirebase() {
  if (!isFirebaseConfigured()) return null;
  if (!app) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  }
  return { app, auth, db };
}

export function watchAuth(callback) {
  const ctx = initFirebase();
  if (!ctx) return () => {};
  return onAuthStateChanged(ctx.auth, callback);
}

export async function signUp(pseudo, email, password) {
  const ctx = initFirebase();
  if (!ctx) throw new Error("Firebase non configuré");
  const cred = await createUserWithEmailAndPassword(ctx.auth, email, password);
  await setDoc(doc(ctx.db, "users", cred.user.uid), {
    uid: cred.user.uid,
    pseudo,
    email,
    streak: 0,
    progress: 0,
    prestige: 0,
    joinedAt: serverTimestamp(),
    friends: []
  }, { merge: true });
  return cred.user;
}

export async function signIn(email, password) {
  const ctx = initFirebase();
  if (!ctx) throw new Error("Firebase non configuré");
  const cred = await signInWithEmailAndPassword(ctx.auth, email, password);
  return cred.user;
}

export async function syncUserStats(uid, stats) {
  const ctx = initFirebase();
  if (!ctx) return;
  await setDoc(doc(ctx.db, "users", uid), stats, { merge: true });
}

export async function searchUsersByPseudoOrEmail(term, selfUid) {
  const ctx = initFirebase();
  if (!ctx) return [];
  const q1 = query(collection(ctx.db, "users"), where("pseudo", ">=", term), where("pseudo", "<=", `${term}\uf8ff`));
  const q2 = query(collection(ctx.db, "users"), where("email", "==", term));
  const [r1, r2] = await Promise.all([getDocs(q1), getDocs(q2)]);
  const map = new Map();
  [r1, r2].forEach((snap) => {
    snap.forEach((d) => {
      if (d.id === selfUid) return;
      map.set(d.id, d.data());
    });
  });
  return Array.from(map.values());
}

export async function sendFriendRequest(fromUid, toUid) {
  const ctx = initFirebase();
  if (!ctx) return;
  await addDoc(collection(ctx.db, "friendRequests"), {
    from: fromUid,
    to: toUid,
    status: "pending",
    createdAt: serverTimestamp()
  });
}

export async function getIncomingFriendRequests(uid) {
  const ctx = initFirebase();
  if (!ctx) return [];
  const q = query(collection(ctx.db, "friendRequests"), where("to", "==", uid), where("status", "==", "pending"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function respondToFriendRequest(requestId, fromUid, toUid, accept) {
  const ctx = initFirebase();
  if (!ctx) return;
  await updateDoc(doc(ctx.db, "friendRequests", requestId), { status: accept ? "accepted" : "rejected" });
  if (accept) {
    await Promise.all([
      updateDoc(doc(ctx.db, "users", fromUid), { friends: arrayUnion(toUid) }),
      updateDoc(doc(ctx.db, "users", toUid), { friends: arrayUnion(fromUid) })
    ]);
  }
}

export async function getFriends(uid) {
  const ctx = initFirebase();
  if (!ctx) return [];
  const me = await getDoc(doc(ctx.db, "users", uid));
  if (!me.exists()) return [];
  const ids = Array.isArray(me.data().friends) ? me.data().friends : [];
  const docs = await Promise.all(ids.map((id) => getDoc(doc(ctx.db, "users", id))));
  return docs.filter((d) => d.exists()).map((d) => d.data()).sort((a, b) => (b.streak || 0) - (a.streak || 0));
}
