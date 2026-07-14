// ============================================================
// LUXORA — admin data layer
// CRUD for products / orders / coupons / categories / banners.
// Uses Firestore when configured; otherwise the browser
// (localStorage) so the whole admin is testable immediately,
// and admin edits still flow to the public site in this browser.
// ============================================================
import { lsGet, lsSet } from "./utils.js";
import { loadAllForAdmin, SEED_CATALOG, clearProductCache } from "./products.js";

let _fb = null;
async function fb() {
  if (_fb !== null) return _fb;
  try {
    const cfg = await import("../firebase/firebase-config.js");
    if (!cfg.firebaseConfig || String(cfg.firebaseConfig.apiKey).startsWith("PASTE")) { _fb = false; return false; }
    _fb = await import("./firebase.js");
    return _fb;
  } catch { _fb = false; return false; }
}
export async function usingFirebase() { return !!(await fb()); }

/* =====================================================================
   PRODUCTS
   Local model stored in lx-admin-products: { edits, added, removed }
   ===================================================================== */
const PKEY = "lx-admin-products";
function pstore() { return lsGet(PKEY, { edits: {}, added: [], removed: [] }); }
function psave(s) { lsSet(PKEY, s); clearProductCache(); }

export async function adminListProducts() {
  return loadAllForAdmin();
}

export async function adminSaveProduct(product) {
  const f = await fb();
  if (f) {
    const id = product.id || ("p-" + Date.now());
    await f.setDoc(f.doc(f.db, "products", id), { ...product, id, updatedAt: f.serverTimestamp() }, { merge: true });
    clearProductCache();
    return id;
  }
  // local
  const s = pstore();
  const isSeed = SEED_CATALOG.some((p) => p.id === product.id);
  if (product.id && isSeed) {
    s.edits[product.id] = { ...(s.edits[product.id] || {}), ...product };
  } else if (product.id && s.added.some((p) => p.id === product.id)) {
    s.added = s.added.map((p) => (p.id === product.id ? { ...p, ...product } : p));
  } else {
    product.id = product.id || ("p-" + Date.now());
    s.added.unshift(product);
  }
  psave(s);
  return product.id;
}

export async function adminDeleteProduct(id) {
  const f = await fb();
  if (f) { await f.deleteDoc(f.doc(f.db, "products", id)); clearProductCache(); return; }
  const s = pstore();
  if (s.added.some((p) => p.id === id)) s.added = s.added.filter((p) => p.id !== id);
  else { if (!s.removed.includes(id)) s.removed.push(id); delete s.edits[id]; }
  psave(s);
}

export async function adminDuplicateProduct(product) {
  const copy = { ...product, id: "p-" + Date.now(), name: product.name + " (copy)", featured: false };
  await adminSaveProduct(copy);
  return copy.id;
}

/* =====================================================================
   GENERIC collections (coupons, categories, banners) — same pattern
   ===================================================================== */
async function listCol(name, localKey, seed = []) {
  const f = await fb();
  if (f) {
    const snap = await f.getDocs(f.collection(f.db, name));
    if (!snap.empty) return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return [];
  }
  return lsGet(localKey, seed);
}
async function saveCol(name, localKey, item, seed = []) {
  const f = await fb();
  if (f) {
    const id = item.id || (name.slice(0, 3) + "-" + Date.now());
    await f.setDoc(f.doc(f.db, name, id), { ...item, id }, { merge: true });
    return id;
  }
  const list = lsGet(localKey, seed);
  if (item.id && list.some((x) => x.id === item.id)) {
    lsSet(localKey, list.map((x) => (x.id === item.id ? { ...x, ...item } : x)));
  } else {
    item.id = item.id || (name.slice(0, 3) + "-" + Date.now());
    list.push(item); lsSet(localKey, list);
  }
  return item.id;
}
async function delCol(name, localKey, id, seed = []) {
  const f = await fb();
  if (f) { await f.deleteDoc(f.doc(f.db, name, id)); return; }
  lsSet(localKey, lsGet(localKey, seed).filter((x) => x.id !== id));
}

/* ---- coupons ---- */
const COUPON_SEED = [
  { id: "LUXE10", code: "LUXE10", type: "percent", value: 10, expiry: "2026-12-31", limit: 500, used: 42, active: true },
  { id: "WELCOME15", code: "WELCOME15", type: "percent", value: 15, expiry: "2026-12-31", limit: 1000, used: 118, active: true },
  { id: "SAVE20", code: "SAVE20", type: "fixed", value: 20, expiry: "2026-09-30", limit: 200, used: 63, active: true }
];
export const listCoupons = () => listCol("coupons", "lx-admin-coupons", COUPON_SEED);
export const saveCoupon = (c) => saveCol("coupons", "lx-admin-coupons", c, COUPON_SEED);
export const deleteCoupon = (id) => delCol("coupons", "lx-admin-coupons", id, COUPON_SEED);

/* ---- categories ---- */
const CATEGORY_SEED = [
  { id: "c-women", name: "Women", slug: "women", order: 1, active: true },
  { id: "c-men", name: "Men", slug: "men", order: 2, active: true },
  { id: "c-kids", name: "Kids", slug: "kids", order: 3, active: true }
];
export const listCategories = () => listCol("categories", "lx-admin-categories", CATEGORY_SEED);
export const saveCategory = (c) => saveCol("categories", "lx-admin-categories", c, CATEGORY_SEED);
export const deleteCategory = (id) => delCol("categories", "lx-admin-categories", id, CATEGORY_SEED);

/* ---- banners ---- */
const BANNER_SEED = [
  { id: "b-1", title: "The New Season", subtitle: "Quiet luxury, redefined", image: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1600&q=80", link: "women.html", active: true },
  { id: "b-2", title: "Autumn Sale", subtitle: "Up to 40% off", image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1600&q=80", link: "women.html", active: true }
];
export const listBanners = () => listCol("banners", "lx-admin-banners", BANNER_SEED);
export const saveBanner = (b) => saveCol("banners", "lx-admin-banners", b, BANNER_SEED);
export const deleteBanner = (id) => delCol("banners", "lx-admin-banners", id, BANNER_SEED);

/* =====================================================================
   ORDERS — read all, update status
   ===================================================================== */
export async function adminListOrders() {
  const f = await fb();
  if (f) {
    const snap = await f.getDocs(f.collection(f.db, "orders"));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  }
  // local: gather every lx-orders:* bucket + demo orders
  const out = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith("lx-orders:")) {
      try { out.push(...JSON.parse(localStorage.getItem(k))); } catch {}
    }
  }
  if (!out.length) out.push(...DEMO_ORDERS);
  return out.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

export async function adminUpdateOrderStatus(orderId, status) {
  const f = await fb();
  if (f) { await f.updateDoc(f.doc(f.db, "orders", orderId), { status }); return; }
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith("lx-orders:")) {
      try {
        const list = JSON.parse(localStorage.getItem(k));
        let hit = false;
        const upd = list.map((o) => { if (o.id === orderId) { hit = true; return { ...o, status }; } return o; });
        if (hit) { localStorage.setItem(k, JSON.stringify(upd)); return; }
      } catch {}
    }
  }
  // demo order status override
  const ov = lsGet("lx-demo-order-status", {}); ov[orderId] = status; lsSet("lx-demo-order-status", ov);
}

const DEMO_ORDERS = [
  { id: "LX240455", email: "aisha@example.com", address: { name: "Aisha Malik", city: "Dubai", country: "UAE" }, status: "delivered", createdAt: "2026-06-28T10:00:00Z",
    items: [{ name: "Aria Slip Dress", qty: 1, price: 89, image: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=120&q=80" }], totals: { total: 96.12 } },
  { id: "LX240461", email: "daniel@example.com", address: { name: "Daniel Reed", city: "London", country: "UK" }, status: "shipped", createdAt: "2026-07-02T14:30:00Z",
    items: [{ name: "Oxford Cotton Shirt", qty: 2, price: 78, image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=120&q=80" }], totals: { total: 168.48 } },
  { id: "LX240468", email: "priya@example.com", address: { name: "Priya Kapoor", city: "Mumbai", country: "India" }, status: "pending", createdAt: "2026-07-08T09:15:00Z",
    items: [{ name: "Nour Flowing Abaya", qty: 1, price: 139, image: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=120&q=80" }], totals: { total: 150.12 } }
];

/* =====================================================================
   CUSTOMERS — derived from orders + registered users
   ===================================================================== */
export async function adminListCustomers() {
  const f = await fb();
  if (f) {
    const snap = await f.getDocs(f.collection(f.db, "users"));
    const users = snap.docs.map((d) => ({ uid: d.id, ...d.data(), orders: 0, spent: 0 }));
    // fold in order counts & spend
    const orders = await adminListOrders();
    orders.forEach((o) => {
      const u = users.find((x) => x.uid === o.uid || x.email === o.email);
      if (u) { u.orders += 1; u.spent += o.totals?.total || 0; }
    });
    return users;
  }
  // local: derive from accounts + orders
  const map = new Map();
  const accts = lsGet("lx-accounts", {});
  Object.values(accts).forEach((a) => map.set(a.email, { name: a.name, email: a.email, orders: 0, spent: 0, banned: !!a.banned }));
  const bans = lsGet("lx-admin-bans", {});
  const orders = await adminListOrders();
  orders.forEach((o) => {
    const email = o.email || o.address?.email || "guest";
    const c = map.get(email) || { name: o.address?.name || "Guest", email, orders: 0, spent: 0, banned: false };
    c.orders += 1; c.spent += o.totals?.total || 0;
    if (bans[email]) c.banned = true;
    map.set(email, c);
  });
  return [...map.values()];
}

// Ban / unban a customer (by email). In Firebase mode, sets banned on their user doc.
export async function adminSetBanned(email, banned, uid) {
  const f = await fb();
  if (f && uid) {
    await f.updateDoc(f.doc(f.db, "users", uid), { banned });
    return;
  }
  const bans = lsGet("lx-admin-bans", {});
  if (banned) bans[email] = true; else delete bans[email];
  lsSet("lx-admin-bans", bans);
}

/* =====================================================================
   REVIEWS — customer-submitted, admin-moderated
   ===================================================================== */
const REVIEW_SEED = [
  { id: "rv-1", productId: "w-dress-01", name: "Aisha M.", rating: 5, text: "The fabric is beautiful and the fit is exactly as described. Will order again.", status: "approved", reply: "", createdAt: "2026-06-20T10:00:00Z" },
  { id: "rv-2", productId: "m-shirt-01", name: "Daniel R.", rating: 4, text: "Great quality for the price. Sizing runs slightly large.", status: "approved", reply: "Thanks Daniel — we'd suggest sizing down!", createdAt: "2026-06-25T10:00:00Z" },
  { id: "rv-3", productId: "w-abaya-01", name: "Fatima Z.", rating: 5, text: "Absolutely stunning, the drape is gorgeous.", status: "pending", reply: "", createdAt: "2026-07-05T10:00:00Z" }
];
export async function adminListReviews() {
  const f = await fb();
  if (f) {
    const snap = await f.getDocs(f.collection(f.db, "reviews"));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  return lsGet("lx-admin-reviews", REVIEW_SEED);
}
export async function adminSaveReview(review) {
  const f = await fb();
  if (f) {
    const id = review.id || ("rv-" + Date.now());
    await f.setDoc(f.doc(f.db, "reviews", id), { ...review, id }, { merge: true });
    return id;
  }
  const list = lsGet("lx-admin-reviews", REVIEW_SEED);
  if (review.id && list.some((r) => r.id === review.id)) {
    lsSet("lx-admin-reviews", list.map((r) => (r.id === review.id ? { ...r, ...review } : r)));
  } else {
    review.id = review.id || ("rv-" + Date.now());
    list.push(review); lsSet("lx-admin-reviews", list);
  }
  return review.id;
}
export async function adminDeleteReview(id) {
  const f = await fb();
  if (f) { await f.deleteDoc(f.doc(f.db, "reviews", id)); return; }
  lsSet("lx-admin-reviews", lsGet("lx-admin-reviews", REVIEW_SEED).filter((r) => r.id !== id));
}
// Public: approved reviews for one product (used by the product page).
export async function approvedReviews(productId) {
  const all = await adminListReviews();
  return all.filter((r) => r.productId === productId && r.status === "approved");
}
// Public: submit a review (goes into the moderation queue as pending).
export async function submitReview(review) {
  return adminSaveReview({ ...review, status: "pending", reply: "", createdAt: new Date().toISOString() });
}

/* =====================================================================
   PUBLISH SEED CATALOG TO FIRESTORE (one-click go-live helper)
   ===================================================================== */
export async function publishCatalogToFirestore() {
  const f = await fb();
  if (!f) throw new Error("Connect Firebase first (add your keys to firebase-config.js).");
  const { SEED_CATALOG } = await import("./products.js");
  let count = 0;
  for (const p of SEED_CATALOG) {
    await f.setDoc(f.doc(f.db, "products", p.id), { ...p, updatedAt: f.serverTimestamp() }, { merge: true });
    count++;
  }
  return count;
}
export async function uploadImage(file) {
  const cfg = await import("../firebase/firebase-config.js");
  const cloud = cfg.CLOUDINARY;
  if (!cloud || String(cloud.cloudName).startsWith("PASTE")) {
    // Not configured yet — return a local preview data URL so the admin still works.
    return await fileToDataURL(file);
  }
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", cloud.uploadPreset);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud.cloudName}/image/upload`, { method: "POST", body: form });
  if (!res.ok) throw new Error("Image upload failed");
  const data = await res.json();
  return data.secure_url;
}
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
