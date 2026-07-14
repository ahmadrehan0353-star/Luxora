// ============================================================
// LUXORA — product data layer
// Reads live products from Firestore when configured; otherwise
// serves a rich built-in catalog so the storefront always works.
// The admin dashboard writes to the same Firestore collection,
// so admin edits appear on the public site automatically.
// ============================================================
import { placeholder } from "./utils.js";

let _cache = null;

// ---- built-in seed catalog (professional placeholder imagery via picsum) ----
const SEED = buildSeed();

function buildSeed() {
  const mk = (id, name, category, sub, price, sale, tags, colors, sizes, imgs) => {
    const pics = imgs && imgs.length ? imgs : [placeholder(id + "a"), placeholder(id + "b")];
    return {
      id, name, category, sub, price,
      salePrice: sale || null,
      colors: colors || [{ name: "Black", hex: "#111" }, { name: "Ivory", hex: "#efe9dd" }],
      sizes: sizes || ["XS", "S", "M", "L", "XL"],
      featured: tags.includes("featured"),
      trending: tags.includes("trending"),
      bestseller: tags.includes("best"),
      isNew: tags.includes("new"),
      stock: 24,
      rating: 4.6,
      images: pics,
      image: pics[0],
      desc: `The ${name} is a LUXORA signature — crafted from premium fabric with a considered, elegant finish. A versatile piece designed to be worn and loved season after season.`,
      specs: { Fabric: "Premium quality", Fit: "True to size", Care: "Follow care label", Origin: "Ethically crafted" },
      active: true
    };
  };

  // Real themed photos via Unsplash source (always returns a live image for the keywords).
  // Curated fabric & textile close-ups (no people) — elegant, on-brand,
  // and reliable. Each product gets a deterministic pick so it's consistent.
  const FABRIC_IMG = [
    "1470071459604-3b5ec3a7fe05",
    "1441974231531-c6227db76b6e",
    "1501785888041-af3ef285b470",
    "1416879595882-3373a0480b5b",
    "1447752875215-b2761acb3c5d"
  ];
  const pickImg = (id) => {
    let h = 0; const str = String(id || "x");
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return FABRIC_IMG[h % FABRIC_IMG.length];
  };
  const IMG = (kw, id) => {
    const pid = pickImg(id);
    return [
      `https://images.unsplash.com/photo-${pid}?auto=format&fit=crop&w=700&q=80`,
      `https://images.unsplash.com/photo-${pid}?auto=format&fit=crop&w=700&q=80&sat=-40`
    ];
  };

  return [
    // No sample products — the store is managed entirely from the admin panel.
    // Add products via /admin/products.html; they save to Firestore and appear here.
  ];
}

// ---- Firestore-aware loader ----
// Priority: live Firestore products → otherwise the built-in seed catalog
// merged with any local admin edits (so the admin panel controls the public
// site even before Firebase is connected).
export async function loadProducts() {
  if (_cache) return _cache;
  try {
    const { db, collection, getDocs } = await import("./firebase.js");
    const snap = await getDocs(collection(db, "products"));
    if (!snap.empty) {
      const live = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        .filter((p) => p.active !== false)
        .map(normalize);
      _cache = live;
      wireSearch();
      return live;
    }
  } catch (e) {
    // Firebase not configured yet — fall through to seed + local admin edits.
    console.info("LUXORA: using local catalog (Firebase not configured yet).");
  }
  _cache = mergeLocal(SEED).filter((p) => p.active !== false).map(normalize);
  wireSearch();
  return _cache;
}

// Merge the built-in seed catalog with local admin changes stored in the browser.
// lx-admin-products holds: { edits:{id:patch}, added:[product], removed:[id] }
function mergeLocal(seed) {
  let store;
  try { store = JSON.parse(localStorage.getItem("lx-admin-products")) || {}; }
  catch { store = {}; }
  const edits = store.edits || {};
  const added = store.added || [];
  const removed = new Set(store.removed || []);

  let list = seed.map((p) => (edits[p.id] ? { ...p, ...edits[p.id] } : p));
  list = list.filter((p) => !removed.has(p.id));
  return [...added, ...list];
}

// let the admin invalidate the public-site cache after edits
export function clearProductCache() { _cache = null; }

function normalize(p) {
  const images = p.images && p.images.length ? p.images : [p.image || placeholder(p.id)];
  return {
    ...p,
    images,
    image: p.image || images[0],
    salePrice: p.salePrice || null,
    colors: p.colors || [{ name: "Black", hex: "#111" }],
    sizes: p.sizes || ["S", "M", "L"],
  };
}

export async function getProduct(id) {
  const all = await loadProducts();
  return all.find((p) => p.id === id) || null;
}

// Admin-facing: every product including inactive/disabled ones (for the dashboard).
export async function loadAllForAdmin() {
  try {
    const { db, collection, getDocs } = await import("./firebase.js");
    const snap = await getDocs(collection(db, "products"));
    if (!snap.empty) return snap.docs.map((d) => ({ id: d.id, ...d.data() })).map(normalize);
  } catch {}
  return mergeLocal(SEED).map(normalize);
}
export { SEED as SEED_CATALOG };
export async function byCategory(cat) {
  const all = await loadProducts();
  return cat === "all" ? all : all.filter((p) => p.category === cat);
}
export async function featured() { return (await loadProducts()).filter((p) => p.featured); }
export async function trending() { return (await loadProducts()).filter((p) => p.trending); }
export async function bestsellers() { return (await loadProducts()).filter((p) => p.bestseller); }
export async function newArrivals() { return (await loadProducts()).filter((p) => p.isNew); }

// expose a search fn for the navbar autocomplete
function wireSearch() {
  window.__lxSearch = async (q) => {
    const all = await loadProducts();
    return all.filter((p) =>
      (p.name + " " + p.category + " " + (p.sub||"") + " " + p.colors.map(c=>c.name).join(" "))
        .toLowerCase().includes(q));
  };
}

export const CATEGORIES = {
  women: ["Unstitched","Stitched","Kurtis","Shalwar Kameez","Lawn","Formals","Party Wear","Abayas","Hijabs","Accessories"],
  men: ["Shirts","T-Shirts","Kurtas","Shalwar Kameez","Waistcoats","Trousers","Accessories"],
  kids: ["Girls","Boys","Babies","Accessories"]
};
