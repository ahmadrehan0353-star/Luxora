// ============================================================
// LUXORA — authentication layer
// Wraps Firebase Auth + a Firestore user profile.
// Falls back to a local "demo account" mode when Firebase
// isn't configured yet, so login/signup/checkout are testable
// immediately (the same philosophy as the seed catalog).
// ============================================================
import { lsGet, lsSet, isEmail } from "./utils.js";

let _firebase = null;      // cached firebase module (or false if unavailable)
let _profileCache = null;

async function fb() {
  if (_firebase !== null) return _firebase;
  try {
    const cfg = await import("../firebase/firebase-config.js");
    if (!cfg.firebaseConfig || String(cfg.firebaseConfig.apiKey).startsWith("PASTE")) {
      _firebase = false;            // not configured yet
      return false;
    }
    _firebase = await import("./firebase.js");
    return _firebase;
  } catch {
    _firebase = false;
    return false;
  }
}

/* ---------------- local demo-account fallback ---------------- */
const LKEY = "lx-accounts";          // { email: {name,email,pass} }
const SKEY = "lx-session";           // current email

function localSignup({ name, email, password }) {
  const accts = lsGet(LKEY, {});
  if (accts[email]) throw new Error("An account with this email already exists.");
  accts[email] = { name, email, pass: password };
  lsSet(LKEY, accts);
  lsSet(SKEY, email);
  return { uid: "local:" + email, email, displayName: name };
}
function localLogin({ email, password }) {
  const accts = lsGet(LKEY, {});
  const a = accts[email];
  if (!a || a.pass !== password) throw new Error("Email or password is incorrect.");
  lsSet(SKEY, email);
  return { uid: "local:" + email, email, displayName: a.name };
}
function localUser() {
  const email = lsGet(SKEY, null);
  if (!email) return null;
  const a = lsGet(LKEY, {})[email];
  return a ? { uid: "local:" + email, email, displayName: a.name } : null;
}

/* ---------------- public API ---------------- */
export async function signUp({ name, email, password }) {
  if (!name?.trim()) throw new Error("Please enter your name.");
  if (!isEmail(email)) throw new Error("Please enter a valid email.");
  if ((password || "").length < 6) throw new Error("Password must be at least 6 characters.");

  const f = await fb();
  if (!f) return localSignup({ name, email, password });

  const cred = await f.createUserWithEmailAndPassword(f.auth, email, password);
  await f.updateProfile(cred.user, { displayName: name });
  // send a real verification email (link-based) via Firebase
  try { await f.sendEmailVerification(cred.user); } catch (e) { console.warn("verification email:", e); }
  // create a Firestore profile document
  await f.setDoc(f.doc(f.db, "users", cred.user.uid), {
    name, email, createdAt: f.serverTimestamp(), addresses: [], role: "customer", banned: false
  });
  return cred.user;
}

// Resend the verification email to the currently signed-in user.
export async function resendVerification() {
  const f = await fb();
  if (!f || !f.auth.currentUser) throw new Error("Please sign in first.");
  await f.sendEmailVerification(f.auth.currentUser);
}

export async function logIn({ email, password }) {
  if (!isEmail(email)) throw new Error("Please enter a valid email.");
  const f = await fb();
  if (!f) return localLogin({ email, password });
  const cred = await f.signInWithEmailAndPassword(f.auth, email, password);
  // check the banned flag on the user's profile
  try {
    const snap = await f.getDoc(f.doc(f.db, "users", cred.user.uid));
    if (snap.exists() && snap.data().banned === true) {
      await f.signOut(f.auth);
      throw new Error("This account has been suspended. Please contact support.");
    }
  } catch (e) {
    if (e.message.includes("suspended")) throw e;
  }
  return cred.user;
}

export async function logOut() {
  const f = await fb();
  if (!f) { lsSet(SKEY, null); return; }
  await f.signOut(f.auth);
}

export async function resetPassword(email) {
  if (!isEmail(email)) throw new Error("Please enter a valid email.");
  const f = await fb();
  if (!f) throw new Error("Password reset requires Firebase to be connected. For now, sign up again with a new password.");
  await f.sendPasswordResetEmail(f.auth, email);
}

// Calls back with the current user (or null) and keeps listening.
export async function onUser(cb) {
  const f = await fb();
  if (!f) { cb(localUser()); return; }
  f.onAuthStateChanged(f.auth, cb);
}

// One-shot: resolve the current user once.
export async function currentUser() {
  const f = await fb();
  if (!f) return localUser();
  return new Promise((res) => {
    const unsub = f.onAuthStateChanged(f.auth, (u) => { unsub(); res(u); });
  });
}

/* ---------------- user profile (addresses etc.) ---------------- */
export async function getProfile(user) {
  if (!user) return null;
  const f = await fb();
  if (!f) {
    return lsGet("lx-profile:" + user.email, { name: user.displayName, email: user.email, addresses: [] });
  }
  const snap = await f.getDoc(f.doc(f.db, "users", user.uid));
  return snap.exists() ? snap.data() : { name: user.displayName, email: user.email, addresses: [] };
}

export async function saveAddresses(user, addresses) {
  const f = await fb();
  if (!f) { lsSet("lx-profile:" + user.email, { name: user.displayName, email: user.email, addresses }); return; }
  await f.updateDoc(f.doc(f.db, "users", user.uid), { addresses });
}

/* ---------------- orders ---------------- */
export async function placeOrder(user, order) {
  const f = await fb();
  if (!f) {
    const list = lsGet("lx-orders:" + (user?.email || "guest"), []);
    const rec = { ...order, id: "LX" + Date.now(), uid: user?.uid || "guest", createdAt: new Date().toISOString(), status: "pending" };
    list.unshift(rec);
    lsSet("lx-orders:" + (user?.email || "guest"), list);
    return rec;
  }
  const ref = await f.addDoc(f.collection(f.db, "orders"), {
    ...order, uid: user.uid, email: user.email, status: "pending", createdAt: f.serverTimestamp()
  });
  return { id: ref.id, ...order };
}

export async function getOrders(user) {
  if (!user) return [];
  const f = await fb();
  if (!f) return lsGet("lx-orders:" + user.email, []);
  const q = f.query(f.collection(f.db, "orders"), f.where("uid", "==", user.uid));
  const snap = await f.getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
}
