// ============================================================
// LUXORA — shared utilities
// ============================================================

// ---- money ----
export const money = (n) => "Rs " + Number(n || 0).toLocaleString("en-PK", { maximumFractionDigits: 0 });

// ---- input sanitising (prevents HTML/script injection in rendered strings) ----
export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

// ---- validation ----
export const isEmail = (v) => /^\S+@\S+\.\S+$/.test(String(v || "").trim());
export const isNonEmpty = (v) => String(v || "").trim().length > 0;

// ---- localStorage helpers (cart & wishlist for guests) ----
export function lsGet(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
export function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// ---- URL params ----
export const param = (k) => new URLSearchParams(location.search).get(k);

// ---- toast ----
let toastTimer;
export function toast(msg, kind = "") {
  let el = document.getElementById("lx-toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "lx-toast";
    el.className = "lx-toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.className = "lx-toast show " + kind;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.className = "lx-toast"), 2600);
}

// ---- debounce (used by instant search) ----
export function debounce(fn, ms = 220) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

// ---- currency-safe cart math ----
export function cartTotals(lines, products) {
  let count = 0, subtotal = 0;
  for (const l of lines) {
    const p = products.find((x) => x.id === l.pid);
    if (!p) continue;
    count += l.qty;
    subtotal += (p.salePrice || p.price) * l.qty;
  }
  return { count, subtotal };
}

// ---- placeholder image (professional royalty-free, deterministic per key) ----
export function placeholder(seed, w = 600, h = 750) {
  const s = encodeURIComponent(seed || "luxora");
  return `https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=${w}&q=80`;
}

// ---- lazy image helper ----
export function lazyImg(src, alt = "") {
  return `<img loading="lazy" src="${esc(src)}" alt="${esc(alt)}" onerror="this.src='https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=600&q=80'">`;
}

// ---- theme (dark mode) ----
export function initTheme() {
  const saved = lsGet("lx-theme", null);
  if (saved === "dark" || (saved === null && matchMedia("(prefers-color-scheme: dark)").matches)) {
    document.documentElement.setAttribute("data-theme", "dark");
  }
}
export function toggleTheme() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  if (isDark) { document.documentElement.removeAttribute("data-theme"); lsSet("lx-theme", "light"); }
  else { document.documentElement.setAttribute("data-theme", "dark"); lsSet("lx-theme", "dark"); }
}
