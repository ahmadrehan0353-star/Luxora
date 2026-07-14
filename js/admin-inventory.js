import { requireAdmin, renderAdminShell } from "./admin-guard.js";
import { adminListProducts, adminSaveProduct } from "./admin-data.js";
import { esc, toast } from "./utils.js";

let products = [];
(async function () {
  const user = await requireAdmin(); if (!user) return;
  const body = renderAdminShell("inventory", user);
  body.innerHTML = `
    <div class="ad-h"><div><h1>Inventory</h1><p>Stock levels and low-stock alerts</p></div></div>
    <div class="ad-stats" id="invStats"></div>
    <div class="ad-toolbar">
      <input class="ad-search" id="search" placeholder="Search products…">
      <select class="ad-select" id="filter"><option value="">All</option><option value="low">Low stock (≤8)</option><option value="out">Out of stock</option></select>
    </div>
    <div class="ad-panel" style="padding:0;overflow-x:auto">
      <table class="ad-table"><thead><tr><th>Product</th><th>Category</th><th>Current stock</th><th>Update</th></tr></thead>
      <tbody id="rows"></tbody></table>
    </div>`;
  document.getElementById("search").oninput = render;
  document.getElementById("filter").onchange = render;
  products = await adminListProducts();
  render();
})();

function render() {
  const low = products.filter((p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 8).length;
  const out = products.filter((p) => (p.stock ?? 0) === 0).length;
  const units = products.reduce((s, p) => s + (p.stock ?? 0), 0);
  document.getElementById("invStats").innerHTML = `
    <div class="stat"><div class="label">Total units</div><div class="num">${units}</div></div>
    <div class="stat"><div class="label">Low stock</div><div class="num">${low}</div><div class="delta ${low ? "down" : "up"}">${low ? "needs attention" : "all good"}</div></div>
    <div class="stat"><div class="label">Out of stock</div><div class="num">${out}</div><div class="delta ${out ? "down" : "up"}">${out ? "restock soon" : "none"}</div></div>
    <div class="stat"><div class="label">Products</div><div class="num">${products.length}</div></div>`;

  const q = (document.getElementById("search").value || "").toLowerCase();
  const f = document.getElementById("filter").value;
  let list = products.filter((p) => (p.name + p.category).toLowerCase().includes(q));
  if (f === "low") list = list.filter((p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 8);
  if (f === "out") list = list.filter((p) => (p.stock ?? 0) === 0);

  document.getElementById("rows").innerHTML = list.map((p) => `
    <tr>
      <td class="prod-cell"><img class="thumb" src="${esc(p.image)}" alt=""><b>${esc(p.name)}</b></td>
      <td>${esc(p.category)}</td>
      <td>${(p.stock ?? 0) === 0 ? `<span class="badge cancelled">Out</span>` : (p.stock ?? 0) <= 8 ? `<span class="badge pending">${p.stock} left</span>` : `<span class="badge delivered">${p.stock}</span>`}</td>
      <td><div style="display:flex;gap:8px"><input type="number" min="0" value="${p.stock ?? 0}" data-id="${esc(p.id)}" style="width:90px;padding:8px 10px;border:1.5px solid var(--line-strong);border-radius:8px;background:var(--surface);color:var(--ink)"><button class="mini-btn gold" data-save="${esc(p.id)}">Save</button></div></td>
    </tr>`).join("") || `<tr class="empty-row"><td colspan="4">No products.</td></tr>`;

  document.getElementById("rows").querySelectorAll("[data-save]").forEach((b) =>
    b.onclick = async () => {
      const inp = document.querySelector(`input[data-id="${b.dataset.save}"]`);
      const stock = parseInt(inp.value) || 0;
      await adminSaveProduct({ id: b.dataset.save, stock });
      const p = products.find((x) => x.id === b.dataset.save); if (p) p.stock = stock;
      toast("Stock updated ✦", "ok"); render();
    });
}
