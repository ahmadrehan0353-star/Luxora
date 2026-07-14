import { requireAdmin, renderAdminShell } from "./admin-guard.js";
import { adminListProducts, adminSaveProduct, adminDeleteProduct, adminDuplicateProduct, uploadImage, listCategories } from "./admin-data.js";
import { money, esc, toast } from "./utils.js";
import { CATEGORIES } from "./products.js";

let products = [], categories = [], editing = null, workImages = [], workColors = [], workSizes = [];

(async function () {
  const user = await requireAdmin(); if (!user) return;
  const body = renderAdminShell("products", user);
  categories = await listCategories();

  body.innerHTML = `
    <div class="ad-h">
      <div><h1>Products</h1><p>Add, edit and manage everything shown on the storefront</p></div>
      <button class="btn btn-primary" id="newBtn">+ New product</button>
    </div>
    <div class="ad-toolbar">
      <input class="ad-search" id="search" placeholder="Search products…">
      <select class="ad-select" id="catFilter"><option value="">All categories</option>
        <option value="women">Women</option><option value="men">Men</option><option value="kids">Kids</option></select>
      <select class="ad-select" id="statusFilter"><option value="">All status</option>
        <option value="active">Active</option><option value="disabled">Disabled</option></select>
    </div>
    <div class="ad-panel" style="padding:0;overflow-x:auto">
      <table class="ad-table"><thead><tr>
        <th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Tags</th><th>Status</th><th>Actions</th>
      </tr></thead><tbody id="rows"></tbody></table>
    </div>`;

  document.getElementById("newBtn").onclick = () => openEditor(null);
  document.getElementById("search").oninput = renderRows;
  document.getElementById("catFilter").onchange = renderRows;
  document.getElementById("statusFilter").onchange = renderRows;

  await reload();
})();

async function reload() { products = await adminListProducts(); renderRows(); }

function renderRows() {
  const q = (document.getElementById("search").value || "").toLowerCase();
  const cat = document.getElementById("catFilter").value;
  const st = document.getElementById("statusFilter").value;
  let list = products.filter((p) =>
    (!q || (p.name + p.sub + p.category).toLowerCase().includes(q)) &&
    (!cat || p.category === cat) &&
    (!st || (st === "active" ? p.active !== false : p.active === false)));

  document.getElementById("rows").innerHTML = list.map((p) => {
    const tags = [p.featured && "Featured", p.trending && "Trending", p.bestseller && "Best", p.isNew && "New"].filter(Boolean);
    return `<tr>
      <td class="prod-cell"><img class="thumb" src="${esc(p.image)}" alt=""><b>${esc(p.name)}</b></td>
      <td>${esc(p.category)}<br><span class="muted" style="font-size:.78rem">${esc(p.sub || "")}</span></td>
      <td>${p.salePrice ? `<b>${money(p.salePrice)}</b> <span class="muted" style="text-decoration:line-through">${money(p.price)}</span>` : money(p.price)}</td>
      <td>${p.stock ?? 0}</td>
      <td>${tags.map((t) => `<span class="pill feat">${t}</span>`).join(" ") || "—"}</td>
      <td><span class="pill ${p.active === false ? "off" : "on"}">${p.active === false ? "Disabled" : "Active"}</span></td>
      <td><div class="t-actions">
        <button class="mini-btn" data-act="edit" data-id="${esc(p.id)}">Edit</button>
        <button class="mini-btn gold" data-act="toggle" data-id="${esc(p.id)}">${p.active === false ? "Enable" : "Disable"}</button>
        <button class="mini-btn" data-act="dup" data-id="${esc(p.id)}">Duplicate</button>
        <button class="mini-btn danger" data-act="del" data-id="${esc(p.id)}">Delete</button>
      </div></td>
    </tr>`;
  }).join("") || `<tr class="empty-row"><td colspan="7">No products match.</td></tr>`;

  document.getElementById("rows").querySelectorAll("[data-act]").forEach((b) => {
    b.onclick = () => rowAction(b.dataset.act, b.dataset.id);
  });
}

async function rowAction(act, id) {
  const p = products.find((x) => x.id === id);
  if (act === "edit") return openEditor(p);
  if (act === "dup") { await adminDuplicateProduct(p); toast("Product duplicated ✦", "ok"); return reload(); }
  if (act === "toggle") { await adminSaveProduct({ id: p.id, active: !(p.active === false) ? false : true }); toast(p.active === false ? "Enabled" : "Disabled"); return reload(); }
  if (act === "del") return confirmDelete(p);
}

// In-site confirmation modal (replaces the browser's confirm popup)
function confirmDelete(p) {
  const box = document.getElementById("modalBox");
  box.innerHTML = `
    <div style="text-align:center;padding:8px 4px">
      <div style="width:56px;height:56px;border-radius:50%;background:#fbe6e6;display:grid;place-items:center;margin:0 auto 18px">
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#b23838" stroke-width="1.8"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>
      </div>
      <h2 style="margin-bottom:8px">Delete this product?</h2>
      <p class="muted" style="margin-bottom:24px"><b>${esc(p.name)}</b> will be permanently removed from your storefront. This can't be undone.</p>
      <div style="display:flex;gap:12px">
        <button class="btn btn-line" id="delCancel" style="flex:1">Cancel</button>
        <button class="btn btn-primary" id="delConfirm" style="flex:1;background:#b23838">Delete product</button>
      </div>
    </div>`;
  document.getElementById("modalBg").classList.add("open");
  document.getElementById("delCancel").onclick = closeModal;
  document.getElementById("delConfirm").onclick = async () => {
    const btn = document.getElementById("delConfirm");
    btn.disabled = true; btn.textContent = "Deleting…";
    // optimistic: remove from view immediately so it feels instant
    products = products.filter((x) => x.id !== p.id);
    renderRows();
    closeModal();
    toast("Product deleted");
    try { await adminDeleteProduct(p.id); }
    catch (e) { toast("Delete failed — refreshing", "err"); await reload(); }
  };
}

/* ---------- editor modal ---------- */
function openEditor(p) {
  editing = p;
  workImages = p?.images ? [...p.images] : [];
  workColors = p?.colors ? p.colors.map((c) => ({ ...c })) : [];
  workSizes = p?.sizes ? [...p.sizes] : [];
  const subs = CATEGORIES[p?.category || "women"];

  const box = document.getElementById("modalBox");
  box.innerHTML = `
    <span class="close-x" id="closeX">×</span>
    <h2>${p ? "Edit product" : "New product"}</h2>
    <div class="ad-form-grid">
      <div class="field full"><label>Name</label><input id="e-name" value="${esc(p?.name || "")}"></div>
      <div class="field"><label>Category</label><select id="e-cat">
        ${["women","men","kids"].map((c) => `<option value="${c}" ${p?.category === c ? "selected" : ""}>${c[0].toUpperCase()+c.slice(1)}</option>`).join("")}
      </select></div>
      <div class="field"><label>Sub-category</label><select id="e-sub"></select></div>
      <div class="field"><label>Price (Rs)</label><input id="e-price" type="number" min="0" step="0.01" value="${p?.price ?? ""}"></div>
      <div class="field"><label>Sale price (Rs, optional)</label><input id="e-sale" type="number" min="0" step="0.01" value="${p?.salePrice ?? ""}"></div>
      <div class="field"><label>Stock</label><input id="e-stock" type="number" min="0" value="${p?.stock ?? 0}"></div>
      <div class="field"><label>Rating</label><input id="e-rating" type="number" min="0" max="5" step="0.1" value="${p?.rating ?? 4.6}"></div>
      <div class="field full"><label>Description</label><textarea id="e-desc" rows="3">${esc(p?.desc || "")}</textarea></div>
    </div>

    <div class="field full"><label>Colours</label>
      <div id="colorList"></div>
      <div class="color-row"><input type="color" id="newColorHex" value="#111111"><input id="newColorName" placeholder="Colour name" style="flex:1;padding:9px 12px;border:1.5px solid var(--line-strong);border-radius:8px;background:var(--surface);color:var(--ink)"><button class="mini-btn" id="addColor">Add</button></div>
    </div>

    <div class="field full"><label>Sizes</label>
      <div class="chips-input" id="sizeList"></div>
      <div style="display:flex;gap:8px;margin-top:8px"><input id="newSize" placeholder="e.g. M or 32 or 4-5y" style="flex:1;padding:9px 12px;border:1.5px solid var(--line-strong);border-radius:8px;background:var(--surface);color:var(--ink)"><button class="mini-btn" id="addSize">Add</button></div>
    </div>

    <div class="field full"><label>Images</label>
      <div class="img-drop" id="imgDrop">Click to upload images (or paste an image URL below)</div>
      <input type="file" id="imgFile" accept="image/*" multiple hidden>
      <div style="display:flex;gap:8px;margin-top:8px"><input id="imgUrl" placeholder="https://image-url.jpg" style="flex:1;padding:9px 12px;border:1.5px solid var(--line-strong);border-radius:8px;background:var(--surface);color:var(--ink)"><button class="mini-btn" id="addUrl">Add URL</button></div>
      <div class="img-previews" id="imgPreviews"></div>
    </div>

    <div class="field full"><label>Tags</label>
      <div style="display:flex;gap:16px;flex-wrap:wrap">
        <label><input type="checkbox" id="e-featured" ${p?.featured ? "checked" : ""}> Featured</label>
        <label><input type="checkbox" id="e-trending" ${p?.trending ? "checked" : ""}> Trending</label>
        <label><input type="checkbox" id="e-best" ${p?.bestseller ? "checked" : ""}> Best seller</label>
        <label><input type="checkbox" id="e-new" ${p?.isNew ? "checked" : ""}> New arrival</label>
      </div>
    </div>

    <div style="display:flex;gap:12px;margin-top:22px">
      <button class="btn btn-line" id="cancelBtn">Cancel</button>
      <button class="btn btn-primary" id="saveBtn" style="flex:1">${p ? "Save changes" : "Create product"}</button>
    </div>`;

  document.getElementById("modalBg").classList.add("open");
  fillSubs(p?.category || "women", p?.sub);
  renderColors(); renderSizes(); renderImages();

  document.getElementById("e-cat").onchange = (e) => fillSubs(e.target.value);
  document.getElementById("closeX").onclick = closeModal;
  document.getElementById("cancelBtn").onclick = closeModal;
  document.getElementById("addColor").onclick = () => {
    const name = document.getElementById("newColorName").value.trim();
    const hex = document.getElementById("newColorHex").value;
    if (!name) { toast("Colour needs a name", "err"); return; }
    workColors.push({ name, hex }); document.getElementById("newColorName").value = ""; renderColors();
  };
  document.getElementById("addSize").onclick = () => {
    const s = document.getElementById("newSize").value.trim();
    if (s && !workSizes.includes(s)) { workSizes.push(s); document.getElementById("newSize").value = ""; renderSizes(); }
  };
  document.getElementById("imgDrop").onclick = () => document.getElementById("imgFile").click();
  document.getElementById("imgFile").onchange = onFiles;
  document.getElementById("addUrl").onclick = () => {
    const u = document.getElementById("imgUrl").value.trim();
    if (u) { workImages.push(u); document.getElementById("imgUrl").value = ""; renderImages(); }
  };
  document.getElementById("saveBtn").onclick = save;
}

function fillSubs(cat, selected) {
  document.getElementById("e-sub").innerHTML = CATEGORIES[cat].map((s) =>
    `<option value="${esc(s)}" ${s === selected ? "selected" : ""}>${esc(s)}</option>`).join("");
}
function renderColors() {
  document.getElementById("colorList").innerHTML = workColors.map((c, i) =>
    `<div class="color-row"><span style="width:28px;height:28px;border-radius:50%;background:${esc(c.hex)};border:1px solid var(--line)"></span> ${esc(c.name)} <button class="mini-btn danger" data-i="${i}">Remove</button></div>`).join("");
  document.getElementById("colorList").querySelectorAll("[data-i]").forEach((b) =>
    b.onclick = () => { workColors.splice(+b.dataset.i, 1); renderColors(); });
}
function renderSizes() {
  document.getElementById("sizeList").innerHTML = workSizes.map((s, i) =>
    `<span class="chip-tag">${esc(s)} <button data-i="${i}">×</button></span>`).join("");
  document.getElementById("sizeList").querySelectorAll("[data-i]").forEach((b) =>
    b.onclick = () => { workSizes.splice(+b.dataset.i, 1); renderSizes(); });
}
function renderImages() {
  document.getElementById("imgPreviews").innerHTML = workImages.map((src, i) =>
    `<div class="img-prev"><img src="${esc(src)}" alt=""><button data-i="${i}">×</button></div>`).join("");
  document.getElementById("imgPreviews").querySelectorAll("[data-i]").forEach((b) =>
    b.onclick = () => { workImages.splice(+b.dataset.i, 1); renderImages(); });
}
async function onFiles(e) {
  const files = [...e.target.files];
  if (!files.length) return;
  toast("Uploading image…");
  for (const f of files) {
    try { const url = await uploadImage(f); workImages.push(url); renderImages(); }
    catch (err) { toast("Upload failed: " + err.message, "err"); }
  }
  toast("Image added ✦", "ok");
  e.target.value = "";
}

async function save() {
  const name = document.getElementById("e-name").value.trim();
  const price = parseFloat(document.getElementById("e-price").value);
  if (!name) { toast("Please enter a name", "err"); return; }
  if (isNaN(price)) { toast("Please enter a price", "err"); return; }

  const sale = parseFloat(document.getElementById("e-sale").value);
  const product = {
    id: editing?.id,
    name,
    category: document.getElementById("e-cat").value,
    sub: document.getElementById("e-sub").value,
    price,
    salePrice: isNaN(sale) ? null : sale,
    stock: parseInt(document.getElementById("e-stock").value) || 0,
    rating: parseFloat(document.getElementById("e-rating").value) || 4.6,
    desc: document.getElementById("e-desc").value.trim(),
    colors: workColors.length ? workColors : [{ name: "Black", hex: "#111111" }],
    sizes: workSizes.length ? workSizes : ["S", "M", "L"],
    images: workImages.length ? workImages : undefined,
    image: workImages[0] || editing?.image,
    featured: document.getElementById("e-featured").checked,
    trending: document.getElementById("e-trending").checked,
    bestseller: document.getElementById("e-best").checked,
    isNew: document.getElementById("e-new").checked,
    active: editing?.active !== false
  };

  const btn = document.getElementById("saveBtn"); btn.disabled = true; btn.textContent = "Saving…";
  try {
    await adminSaveProduct(product);
    toast("Saved — now live on the storefront ✦", "ok");
    closeModal();
    await reload();
  } catch (e) { toast(e.message || "Save failed", "err"); btn.disabled = false; btn.textContent = "Save"; }
}

function closeModal() { document.getElementById("modalBg").classList.remove("open"); }
document.getElementById("modalBg").addEventListener("click", (e) => { if (e.target.id === "modalBg") closeModal(); });
