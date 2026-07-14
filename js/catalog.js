// ============================================================
// LUXORA — shared catalog engine for women / men / kids pages
// Handles: sub-category filter, size filter, colour filter,
// price slider, sort, search query, and rendering.
// ============================================================
import { renderNavbar } from "./navbar.js";
import { renderFooter, initReveal } from "./app.js";
import { byCategory, CATEGORIES, loadProducts } from "./products.js";
import { renderGrid } from "./product-card.js";
import { param, esc } from "./utils.js";

const state = {
  category: "women",
  all: [],
  subs: new Set(),
  sizes: new Set(),
  colors: new Set(),
  maxPrice: 0,
  priceCap: 0,
  sort: "featured",
  query: ""
};

export async function initCatalog(category, heroImg, heroTitle, heroText) {
  state.category = category;
  renderNavbar(category);
  renderFooter();

  // hero
  document.getElementById("catHeroImg").src = heroImg;
  document.getElementById("catHeroTitle").textContent = heroTitle;
  document.getElementById("catHeroText").textContent = heroText;

  // show skeletons while loading
  showSkeletons();

  state.all = await byCategory(category);

  if (!state.all.length) {
    console.warn(`LUXORA: no products found for category "${category}" — check products.js / CATEGORIES.`);
  }

  // price bounds from the real data — fall back to a realistic max (not 100)
  // if the category somehow came back empty, so the slider never silently
  // collapses to a useless Rs 100 range.
  const prices = state.all.map((p) => p.salePrice || p.price).filter((n) => Number.isFinite(n) && n > 0);
  const highest = prices.length ? Math.max(...prices) : 20000;
  state.priceCap = Math.ceil(highest / 100) * 100;
  state.maxPrice = state.priceCap;

  // deep-link support: ?cat=Dresses or ?q=linen
  const urlCat = param("cat");
  if (urlCat && CATEGORIES[category].includes(urlCat)) state.subs.add(urlCat);
  state.query = (param("q") || "").toLowerCase();

  buildFilters();
  wireControls();
  render();
  initReveal();
}

function showSkeletons() {
  const grid = document.getElementById("plpGrid");
  grid.innerHTML = Array.from({ length: 8 }, () => `<div class="skeleton sk-card"></div>`).join("");
}

function buildFilters() {
  // sub-categories present in this category's data
  const subsAvailable = CATEGORIES[state.category].filter((s) =>
    state.all.some((p) => p.sub === s));
  document.getElementById("subFilters").innerHTML = subsAvailable.map((s) =>
    `<button class="chip ${state.subs.has(s) ? "on" : ""}" data-sub="${esc(s)}">${esc(s)}</button>`).join("");

  // sizes present
  const sizeSet = new Set();
  state.all.forEach((p) => p.sizes.forEach((s) => sizeSet.add(s)));
  document.getElementById("sizeFilters").innerHTML = [...sizeSet].map((s) =>
    `<button class="chip size-chip" data-size="${esc(s)}">${esc(s)}</button>`).join("");

  // colours present (unique by name)
  const colMap = new Map();
  state.all.forEach((p) => p.colors.forEach((c) => { if (!colMap.has(c.name)) colMap.set(c.name, c.hex); }));
  document.getElementById("colorFilters").innerHTML = [...colMap.entries()].map(([name, hex]) =>
    `<button class="cdot" title="${esc(name)}" aria-label="${esc(name)}" data-color="${esc(name)}" style="background:${esc(hex)}"></button>`).join("");

  // price slider
  const slider = document.getElementById("priceSlider");
  slider.min = 0; slider.max = state.priceCap; slider.value = state.priceCap;
  slider.step = Math.max(50, Math.round(state.priceCap / 100 / 50) * 50);
  document.getElementById("priceVal").textContent = "Rs " + state.priceCap;
}

function wireControls() {
  document.getElementById("subFilters").addEventListener("click", (e) => {
    const b = e.target.closest("[data-sub]"); if (!b) return;
    toggle(state.subs, b.dataset.sub, b); render();
  });
  document.getElementById("sizeFilters").addEventListener("click", (e) => {
    const b = e.target.closest("[data-size]"); if (!b) return;
    toggle(state.sizes, b.dataset.size, b); render();
  });
  document.getElementById("colorFilters").addEventListener("click", (e) => {
    const b = e.target.closest("[data-color]"); if (!b) return;
    toggle(state.colors, b.dataset.color, b); render();
  });
  document.getElementById("priceSlider").addEventListener("input", (e) => {
    state.maxPrice = +e.target.value;
    document.getElementById("priceVal").textContent = "Rs " + state.maxPrice;
    render();
  });
  document.getElementById("sortSel").addEventListener("change", (e) => {
    state.sort = e.target.value; render();
  });
  document.getElementById("clearFilters").addEventListener("click", clearAll);
  document.getElementById("filtersToggle").addEventListener("click", () =>
    document.getElementById("filters").classList.toggle("open"));
}

function toggle(set, val, el) {
  set.has(val) ? set.delete(val) : set.add(val);
  el.classList.toggle("on");
}

function clearAll() {
  state.subs.clear(); state.sizes.clear(); state.colors.clear();
  state.maxPrice = state.priceCap; state.query = "";
  document.querySelectorAll(".chip.on, .cdot.on").forEach((e) => e.classList.remove("on"));
  const slider = document.getElementById("priceSlider");
  slider.value = state.priceCap;
  document.getElementById("priceVal").textContent = "Rs " + state.priceCap;
  render();
}

function render() {
  let list = state.all.slice();

  if (state.query) {
    list = list.filter((p) =>
      (p.name + " " + p.sub + " " + p.colors.map((c) => c.name).join(" "))
        .toLowerCase().includes(state.query));
  }
  if (state.subs.size) list = list.filter((p) => state.subs.has(p.sub));
  if (state.sizes.size) list = list.filter((p) => p.sizes.some((s) => state.sizes.has(s)));
  if (state.colors.size) list = list.filter((p) => p.colors.some((c) => state.colors.has(c.name)));
  list = list.filter((p) => (p.salePrice || p.price) <= state.maxPrice);

  switch (state.sort) {
    case "price-asc":  list.sort((a, b) => (a.salePrice || a.price) - (b.salePrice || b.price)); break;
    case "price-desc": list.sort((a, b) => (b.salePrice || b.price) - (a.salePrice || a.price)); break;
    case "name":       list.sort((a, b) => a.name.localeCompare(b.name)); break;
    case "popular":    list.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
    default: // featured: featured first, then trending, then the rest
      list.sort((a, b) => (b.featured - a.featured) || (b.trending - a.trending));
  }

  const grid = document.getElementById("plpGrid");
  const empty = document.getElementById("plpEmpty");
  if (!list.length) {
    grid.innerHTML = "";
    empty.style.display = "block";
  } else {
    empty.style.display = "none";
    renderGrid("plpGrid", list);
  }
  const n = list.length;
  document.getElementById("plpCount").textContent =
    (state.query ? `“${state.query}” — ` : "") + n + (n === 1 ? " item" : " items");
}
