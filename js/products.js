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
    // women (largest)
    mk("w-unstitched-01", "Zara Lawn 3-Piece Unstitched", "women", "Unstitched", 4200, 3400, ["featured","new","trending"], [{name:"Powder Blue",hex:"#bcd0e0"},{name:"Blush",hex:"#e3c4c0"}], ["Unstitched"], IMG("pakistani,lawn,suit","w-unstitched-01")),
    mk("w-unstitched-02", "Meher Embroidered Lawn Suit", "women", "Unstitched", 5800, null, ["best","featured"], [{name:"Sage",hex:"#9aa383"},{name:"Ivory",hex:"#efe9dd"}], ["Unstitched"], IMG("embroidered,textile,dupatta","w-unstitched-02")),
    mk("w-unstitched-03", "Cambric Printed 2-Piece", "women", "Unstitched", 3200, 2600, ["new"], [{name:"Mustard",hex:"#c9a24b"},{name:"Rust",hex:"#a8551f"}], ["Unstitched"], IMG("printed,fabric,textile","w-unstitched-03")),
    mk("w-stitched-01", "Ready-to-Wear Embroidered Kurta Set", "women", "Stitched", 6500, 5200, ["featured","trending"], [{name:"Emerald",hex:"#1f6b4a"},{name:"Maroon",hex:"#6b1f2a"}], ["XS","S","M","L","XL"], IMG("kurta,woman,fashion","w-stitched-01")),
    mk("w-kurti-01", "Chikankari Cotton Kurti", "women", "Kurtis", 2800, null, ["best","new"], [{name:"White",hex:"#fff"},{name:"Sky",hex:"#bcd0e0"},{name:"Peach",hex:"#f0c9a8"}], ["S","M","L","XL"], IMG("kurti,cotton,woman","w-kurti-01")),
    mk("w-kurti-02", "Printed Lawn Kurti", "women", "Kurtis", 1900, 1500, ["trending"], [{name:"Teal",hex:"#2a7a72"},{name:"Coral",hex:"#e07856"}], ["S","M","L","XL"], IMG("kurti,printed,fashion","w-kurti-02")),
    mk("w-sk-01", "Embroidered Shalwar Kameez", "women", "Shalwar Kameez", 7200, null, ["featured"], [{name:"Navy",hex:"#26304a"},{name:"Dusty Rose",hex:"#c99"}], ["S","M","L","XL"], IMG("shalwar,kameez,fashion","w-sk-01")),
    mk("w-lawn-01", "Premium Summer Lawn Collection", "women", "Lawn", 4800, 3900, ["best","featured","new"], [{name:"Mint",hex:"#b8ddc0"},{name:"Lilac",hex:"#c9b8dd"}], ["Unstitched"], IMG("lawn,summer,textile","w-lawn-01")),
    mk("w-formal-01", "Chiffon Formal 3-Piece", "women", "Formals", 12500, 9800, ["featured","trending"], [{name:"Wine",hex:"#5a1f2a"},{name:"Black",hex:"#111"}], ["S","M","L"], IMG("formal,chiffon,dress","w-formal-01")),
    mk("w-party-01", "Sequin Party Maxi", "women", "Party Wear", 15800, null, ["trending","new"], [{name:"Champagne",hex:"#e6d5b8"},{name:"Onyx",hex:"#161616"}], ["S","M","L"], IMG("party,evening,gown","w-party-01")),
    mk("w-abaya-01", "Nour Flowing Abaya", "women", "Abayas", 6800, 5400, ["featured","trending"], [{name:"Black",hex:"#111"},{name:"Stone",hex:"#b8ae9c"}], ["S","M","L","XL"], IMG("abaya,modest,fashion","w-abaya-01")),
    mk("w-abaya-02", "Layla Open Abaya", "women", "Abayas", 7200, null, ["new"], [{name:"Charcoal",hex:"#3a3a3a"}], ["S","M","L","XL"], IMG("abaya,modest,woman","w-abaya-02")),
    mk("w-hijab-01", "Silk Modal Hijab", "women", "Hijabs", 1200, null, ["best"], [{name:"Blush",hex:"#e3c4c0"},{name:"Navy",hex:"#26304a"},{name:"Camel",hex:"#c19a6b"}], ["One size"], IMG("hijab,scarf,silk","w-hijab-01")),
    mk("w-acc-01", "Gold Jhumka Set", "women", "Accessories", 1800, null, ["new"], [{name:"Gold",hex:"#c9a24b"}], ["One size"], IMG("earrings,gold,jewelry","w-acc-01")),
    // men
    mk("m-kurta-01", "Cotton Embroidered Kurta", "men", "Kurtas", 3400, 2800, ["featured","best"], [{name:"White",hex:"#fff"},{name:"Cream",hex:"#eee6d6"},{name:"Grey",hex:"#9a9a9a"}], ["S","M","L","XL","XXL"], IMG("men,kurta,fashion","m-kurta-01")),
    mk("m-sk-01", "Wash & Wear Shalwar Kameez", "men", "Shalwar Kameez", 4200, null, ["best","new"], [{name:"Beige",hex:"#d9c9ae"},{name:"Navy",hex:"#26304a"},{name:"Black",hex:"#111"}], ["S","M","L","XL","XXL"], IMG("men,shalwar,kameez","m-sk-01")),
    mk("m-shirt-01", "Formal Cotton Shirt", "men", "Shirts", 2800, null, ["featured"], [{name:"White",hex:"#fff"},{name:"Sky",hex:"#bcd0e0"}], ["S","M","L","XL","XXL"], IMG("men,formal,shirt","m-shirt-01")),
    mk("m-tshirt-01", "Premium Cotton Tee", "men", "T-Shirts", 1400, 1100, ["best","new"], [{name:"Black",hex:"#111"},{name:"Ecru",hex:"#e7ddca"},{name:"Olive",hex:"#6c6547"}], ["S","M","L","XL","XXL"], IMG("men,tshirt,cotton","m-tshirt-01")),
    mk("m-waistcoat-01", "Embroidered Waistcoat", "men", "Waistcoats", 5200, 4200, ["trending","new"], [{name:"Maroon",hex:"#6b1f2a"},{name:"Black",hex:"#111"}], ["S","M","L","XL"], IMG("men,waistcoat","m-waistcoat-01")),
    mk("m-trouser-01", "Cotton Dress Trousers", "men", "Trousers", 2600, null, ["best"], [{name:"Charcoal",hex:"#3a3a3a"},{name:"Khaki",hex:"#b8a678"}], ["30","32","34","36","38"], IMG("men,trousers","m-trouser-01")),
    mk("m-acc-01", "Leather Peshawari Sandals", "men", "Accessories", 3200, 2600, ["new"], [{name:"Brown",hex:"#6b4a2c"},{name:"Tan",hex:"#b07a4a"}], ["40","41","42","43","44"], IMG("leather,sandals,shoes","m-acc-01")),
    // kids
    mk("k-girl-01", "Girls Embroidered Frock", "kids", "Girls", 2400, 1900, ["featured","new"], [{name:"Blush",hex:"#e3c4c0"},{name:"Sky",hex:"#bcd0e0"}], ["2-3y","4-5y","6-7y","8-9y"], IMG("kids,girl,dress","k-girl-01")),
    mk("k-boy-01", "Boys Kurta Pajama Set", "kids", "Boys", 2200, null, ["best"], [{name:"White",hex:"#fff"},{name:"Navy",hex:"#26304a"}], ["2-3y","4-5y","6-7y","8-9y"], IMG("kids,boy,kurta","k-boy-01")),
    mk("k-baby-01", "Baby Cotton Romper", "kids", "Babies", 1400, null, ["trending","new"], [{name:"Cream",hex:"#eee6d6"},{name:"Mint",hex:"#b8ddc0"}], ["0-3m","3-6m","6-12m","12-18m"], IMG("baby,romper,clothes","k-baby-01")),
    mk("k-acc-01", "Kids Embroidered Cap", "kids", "Accessories", 800, null, ["new"], [{name:"Natural",hex:"#e0d3b8"}], ["S","M","L"], IMG("kids,cap,hat","k-acc-01"))
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
