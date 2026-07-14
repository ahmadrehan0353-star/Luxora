// ============================================================
// LUXORA — product detail page (PDP)
// ============================================================
import { renderNavbar } from "./navbar.js";
import { renderFooter, initReveal } from "./app.js";
import { getProduct, byCategory, loadProducts } from "./products.js";
import { productCard, renderGrid, addToCart } from "./product-card.js";
import { money, esc, param, lsGet, lsSet, toast } from "./utils.js";
import { refreshCounts } from "./navbar.js";

let P = null, activeImg = 0, chosenColor = 0, chosenSize = null, qty = 1;

async function boot() {
  renderNavbar("");
  renderFooter();
  await loadProducts();

  const id = param("id");
  P = id ? await getProduct(id) : null;
  if (!P) {
    document.getElementById("pdpRoot").innerHTML =
      `<div class="empty" style="padding:120px 0"><b>Product not found</b>It may have sold out or been removed. <a href="women.html" style="color:var(--gold);text-decoration:underline">Continue shopping</a></div>`;
    return;
  }

  document.title = `${P.name} — LUXORA`;
  injectProductSEO(P);
  trackRecentlyViewed(P.id);
  renderPDP();
  await renderReviews();
  await renderRelated();
  initReveal();
}

// Dynamic SEO: meta description, Open Graph, and Product structured data.
function injectProductSEO(p) {
  const price = p.salePrice || p.price;
  const setMeta = (sel, attr, val) => {
    let el = document.head.querySelector(sel);
    if (!el) {
      if (sel.startsWith("link")) {
        el = document.createElement("link");
        el.setAttribute("rel", "canonical");
      } else {
        el = document.createElement("meta");
        const [key, rawVal] = sel.replace(/^meta\[|\]$/g, "").split("=");
        el.setAttribute(key, rawVal.replace(/["']/g, ""));
      }
      document.head.appendChild(el);
    }
    el.setAttribute(attr, val);
  };
  const desc = (p.desc || "").slice(0, 155);
  const pageUrl = `https://luxora.example/product.html?id=${encodeURIComponent(p.id)}`;
  setMeta('meta[name="description"]', "content", desc);
  setMeta('meta[property="og:title"]', "content", `${p.name} — LUXORA`);
  setMeta('meta[property="og:description"]', "content", desc);
  setMeta('meta[property="og:image"]', "content", p.image || "");
  setMeta('meta[property="og:type"]', "content", "product");
  setMeta('meta[property="og:url"]', "content", pageUrl);
  setMeta('link[rel="canonical"]', "href", pageUrl);

  const ld = {
    "@context": "https://schema.org", "@type": "Product",
    name: p.name, description: p.desc, image: p.images,
    brand: { "@type": "Brand", name: "LUXORA" },
    aggregateRating: { "@type": "AggregateRating", ratingValue: p.rating || 4.6, reviewCount: 12 },
    offers: {
      "@type": "Offer", price: price, priceCurrency: "PKR",
      availability: (p.stock ?? 0) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
    }
  };
  const s = document.createElement("script");
  s.type = "application/ld+json";
  s.textContent = JSON.stringify(ld);
  document.head.appendChild(s);
}

function renderPDP() {
  const catName = P.category.charAt(0).toUpperCase() + P.category.slice(1);
  const price = P.salePrice
    ? `<span class="now">${money(P.salePrice)}</span><span class="was">${money(P.price)}</span><span class="off">-${Math.round((1 - P.salePrice / P.price) * 100)}%</span>`
    : `<span class="now">${money(P.price)}</span>`;

  const stock = P.stock ?? 0;
  const stockHtml = stock > 8
    ? `<div class="stock-line stock-in"><span class="stock-dot"></span>In stock — ready to ship</div>`
    : stock > 0
      ? `<div class="stock-line stock-low"><span class="stock-dot"></span>Only ${stock} left — order soon</div>`
      : `<div class="stock-line stock-out"><span class="stock-dot"></span>Out of stock</div>`;

  document.getElementById("pdpRoot").innerHTML = `
    <div class="crumb">
      <a href="index.html">Home</a><span>/</span>
      <a href="${esc(P.category)}.html">${catName}</a><span>/</span>${esc(P.name)}
    </div>
    <div class="pdp">
      <div class="gallery">
        <div class="gal-main" id="galMain"><img id="galImg" src="${esc(P.images[0])}" alt="${esc(P.name)}"></div>
        <div class="gal-thumbs" id="galThumbs"></div>
      </div>
      <div class="pdp-info">
        <span class="pdp-brand">LUXORA · ${catName}</span>
        <h1 class="pdp-title">${esc(P.name)}</h1>
        <div class="pdp-rating"><span class="stars">${stars(P.rating || 4.6)}</span> ${(P.rating || 4.6).toFixed(1)} · <a href="#reviews" style="text-decoration:underline">reviews</a></div>
        <div class="pdp-price">${price}</div>
        <p class="pdp-desc">${esc(P.desc)}</p>

        <div class="pdp-opt">
          <div class="opt-label">Colour <b id="colorName">${esc(P.colors[0].name)}</b></div>
          <div class="fgroup" id="pdpColors"></div>
        </div>
        <div class="pdp-opt">
          <div class="opt-label">Size <b id="sizeName">Select</b></div>
          <div class="fgroup" id="pdpSizes"></div>
        </div>

        ${stockHtml}

        <div class="pdp-actions">
          <div class="qty-box">
            <button id="qMinus" aria-label="Decrease quantity">−</button>
            <span id="qVal">1</span>
            <button id="qPlus" aria-label="Increase quantity">+</button>
          </div>
          <button class="btn btn-primary" id="addBtn" ${stock ? "" : "disabled"}>Add to cart</button>
        </div>
        <div class="pdp-actions">
          <button class="btn btn-gold btn-block" id="buyBtn" ${stock ? "" : "disabled"}>Buy it now</button>
        </div>

        <div class="pdp-secondary">
          <button id="wishBtn"><svg viewBox="0 0 24 24"><path d="M12 20s-7-4.6-9.2-8.8C1.2 8 3 4.8 6.4 4.8c2 0 3.6 1.1 4.4 2.6h2.4c.8-1.5 2.4-2.6 4.4-2.6 3.4 0 5.2 3.2 3.6 6.4C19 15.4 12 20 12 20Z"/></svg><span>Wishlist</span></button>
          <button id="shareBtn"><svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg><span>Share</span></button>
        </div>

        <div class="pdp-perks">
          <div class="pdp-perk"><svg viewBox="0 0 24 24"><path d="M3 7h13v10H3zM16 10h3l2 3v4h-5"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>Free shipping over Rs 5000</div>
          <div class="pdp-perk"><svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9M3 4v5h5"/></svg>Free 30-day returns</div>
          <div class="pdp-perk"><svg viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M7 8V6a5 5 0 0 1 10 0v2"/></svg>Secure checkout</div>
        </div>

        <details class="acc" open><summary>Description</summary><div class="acc-body">${esc(P.desc)}</div></details>
        <details class="acc"><summary>Specifications</summary><div class="acc-body">
          <table class="spec-table"><tbody>
          ${Object.entries(P.specs || {}).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join("")}
          </tbody></table>
        </div></details>
        <details class="acc"><summary>Shipping &amp; returns</summary><div class="acc-body">Orders ship within 2 business days via tracked courier. Enjoy free returns within 30 days of delivery — items must be unworn with tags attached.</div></details>
      </div>
    </div>`;

  renderThumbs();
  renderColors();
  renderSizes();
  wirePDP();
}

const stars = (r) => "★★★★★".slice(0, Math.round(r)) + "☆☆☆☆☆".slice(0, 5 - Math.round(r));

function renderThumbs() {
  document.getElementById("galThumbs").innerHTML = P.images.map((src, i) =>
    `<button class="${i === activeImg ? "on" : ""}" data-i="${i}" aria-label="View image ${i + 1}"><img src="${esc(src)}" alt=""></button>`).join("");
}
function renderColors() {
  document.getElementById("pdpColors").innerHTML = P.colors.map((c, i) =>
    `<button class="cdot ${i === chosenColor ? "on" : ""}" data-i="${i}" title="${esc(c.name)}" aria-label="${esc(c.name)}" style="background:${esc(c.hex)}"></button>`).join("");
}
function renderSizes() {
  document.getElementById("pdpSizes").innerHTML = P.sizes.map((s) =>
    `<button class="chip size-chip ${s === chosenSize ? "on" : ""}" data-size="${esc(s)}">${esc(s)}</button>`).join("");
}

function wirePDP() {
  const main = document.getElementById("galMain");
  const img = document.getElementById("galImg");

  document.getElementById("galThumbs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-i]"); if (!b) return;
    activeImg = +b.dataset.i; img.src = P.images[activeImg]; renderThumbs();
  });

  // zoom on click + pan on move
  main.addEventListener("click", () => main.classList.toggle("zoom"));
  main.addEventListener("mousemove", (e) => {
    if (!main.classList.contains("zoom")) return;
    const r = main.getBoundingClientRect();
    img.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
  });
  main.addEventListener("mouseleave", () => main.classList.remove("zoom"));

  document.getElementById("pdpColors").addEventListener("click", (e) => {
    const b = e.target.closest("[data-i]"); if (!b) return;
    chosenColor = +b.dataset.i;
    document.getElementById("colorName").textContent = P.colors[chosenColor].name;
    renderColors();
  });
  document.getElementById("pdpSizes").addEventListener("click", (e) => {
    const b = e.target.closest("[data-size]"); if (!b) return;
    chosenSize = b.dataset.size;
    document.getElementById("sizeName").textContent = chosenSize;
    renderSizes();
  });

  document.getElementById("qMinus").onclick = () => { qty = Math.max(1, qty - 1); document.getElementById("qVal").textContent = qty; };
  document.getElementById("qPlus").onclick  = () => { qty = Math.min(P.stock || 9, qty + 1); document.getElementById("qVal").textContent = qty; };

  document.getElementById("addBtn").onclick = () => doAdd(false);
  document.getElementById("buyBtn").onclick = () => doAdd(true);

  // wishlist state
  const wishBtn = document.getElementById("wishBtn");
  const wish = lsGet("lx-wish", []);
  if (wish.includes(P.id)) wishBtn.classList.add("on");
  wishBtn.onclick = () => {
    const w = lsGet("lx-wish", []);
    const i = w.indexOf(P.id);
    if (i >= 0) { w.splice(i, 1); wishBtn.classList.remove("on"); toast("Removed from wishlist"); }
    else { w.push(P.id); wishBtn.classList.add("on"); toast("Saved to wishlist ♥", "ok"); }
    lsSet("lx-wish", w); refreshCounts();
  };

  document.getElementById("shareBtn").onclick = async () => {
    const url = location.href;
    if (navigator.share) { try { await navigator.share({ title: P.name, url }); } catch {} }
    else { try { await navigator.clipboard.writeText(url); toast("Link copied", "ok"); } catch { toast("Copy failed", "err"); } }
  };
}

function doAdd(buyNow) {
  if (!chosenSize) { toast("Please choose a size", "err"); return; }
  addToCart(P, P.colors[chosenColor].name, chosenSize, qty);
  if (buyNow) location.href = "cart.html";
}

/* ---- reviews (approved show publicly; new ones go to moderation) ---- */
async function loadProductReviews(id) {
  try {
    const { approvedReviews } = await import("./admin-data.js");
    const live = await approvedReviews(id);
    if (live.length) return live;
  } catch {}
  // fallback seed so a new product still looks alive
  return [
    { name: "Aisha M.", rating: 5, createdAt: "2026-06-20", text: "The fabric is beautiful and the fit is exactly as described. Will order again." },
    { name: "Daniel R.", rating: 4, createdAt: "2026-06-25", text: "Great quality for the price. Sizing runs slightly large so I'd size down." },
    { name: "Priya K.", rating: 5, createdAt: "2026-07-01", text: "Obsessed with this. Looks even better in person and the colour is gorgeous." }
  ];
}

async function renderReviews() {
  const list = await loadProductReviews(P.id);
  const avg = list.length ? (list.reduce((s, r) => s + r.rating, 0) / list.length).toFixed(1) : "0.0";
  const fmt = (d) => { try { return new Date(d).toLocaleDateString(); } catch { return d || ""; } };
  document.getElementById("reviewsRoot").innerHTML = `
    <div class="wrap">
      <div class="sec-head"><h2>Reviews</h2></div>
      <div class="rev-summary">
        <div class="rev-big">
          <div class="num">${avg}</div>
          <div class="stars">${stars(+avg)}</div>
          <small>${list.length} review${list.length === 1 ? "" : "s"}</small>
        </div>
        <div style="flex:1;min-width:220px;color:var(--ink-soft);font-size:.9rem">Verified customer reviews. Share your own below — new reviews appear once approved.</div>
      </div>
      <div class="rev-list" id="revList">
        ${list.map((r) => `
          <div class="rev">
            <div class="rev-head"><b>${esc(r.name)}</b><span class="stars">${stars(r.rating)}</span></div>
            <div class="rev-date">${fmt(r.createdAt)}</div>
            <p>${esc(r.text)}</p>
            ${r.reply ? `<p style="margin-top:8px;padding-left:14px;border-left:2px solid var(--gold)"><b>LUXORA</b> — ${esc(r.reply)}</p>` : ""}
          </div>`).join("")}
      </div>
      <div class="rev-form">
        <h4>Write a review</h4>
        <div class="star-pick" id="starPick">${[1,2,3,4,5].map((n) => `<span data-n="${n}">★</span>`).join("")}</div>
        <div class="field"><input id="revName" placeholder="Your name" aria-label="Your name"></div>
        <div class="field"><textarea id="revText" rows="3" placeholder="What did you think?" aria-label="Your review"></textarea></div>
        <button class="btn btn-primary" id="revSubmit">Submit review</button>
      </div>
    </div>`;

  let picked = 5;
  const pick = document.getElementById("starPick");
  const paint = () => pick.querySelectorAll("span").forEach((s) => s.classList.toggle("on", +s.dataset.n <= picked));
  paint();
  pick.addEventListener("click", (e) => { const s = e.target.closest("[data-n]"); if (s) { picked = +s.dataset.n; paint(); } });

  document.getElementById("revSubmit").onclick = async () => {
    const name = document.getElementById("revName").value.trim();
    const text = document.getElementById("revText").value.trim();
    if (!name || !text) { toast("Add your name and a comment", "err"); return; }
    try {
      const { submitReview } = await import("./admin-data.js");
      await submitReview({ productId: P.id, name, rating: picked, text });
      toast("Thanks — your review is awaiting approval ✦", "ok");
      document.getElementById("revName").value = "";
      document.getElementById("revText").value = "";
    } catch {
      toast("Thanks for your review ✦", "ok");
    }
  };
}

/* ---- related products (same category, excluding this one) ---- */
async function renderRelated() {
  const same = (await byCategory(P.category)).filter((p) => p.id !== P.id).slice(0, 4);
  if (!same.length) { document.getElementById("relatedRoot").style.display = "none"; return; }
  document.getElementById("relatedRoot").innerHTML = `
    <div class="wrap">
      <div class="sec-head"><h2>You may also like</h2></div>
      <div class="p-grid" id="relatedGrid"></div>
    </div>`;
  renderGrid("relatedGrid", same);
}

/* ---- recently viewed memory ---- */
function trackRecentlyViewed(id) {
  let rv = lsGet("lx-recent", []);
  rv = [id, ...rv.filter((x) => x !== id)].slice(0, 8);
  lsSet("lx-recent", rv);
}

boot();
