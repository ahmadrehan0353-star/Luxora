import { requireAdmin, renderAdminShell } from "./admin-guard.js";
import { listCategories, saveCategory, deleteCategory } from "./admin-data.js";
import { esc, toast } from "./utils.js";

let cats = [];
(async function () {
  const user = await requireAdmin(); if (!user) return;
  const body = renderAdminShell("categories", user);
  body.innerHTML = `
    <div class="ad-h"><div><h1>Categories</h1><p>Organise the top-level navigation</p></div>
      <button class="btn btn-primary" id="newBtn">+ New category</button></div>
    <div class="ad-panel" style="padding:0;overflow-x:auto">
      <table class="ad-table"><thead><tr><th>Order</th><th>Name</th><th>Slug</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody id="rows"></tbody></table>
    </div>`;
  document.getElementById("newBtn").onclick = () => openEditor(null);
  await reload();
})();

async function reload() { cats = (await listCategories()).sort((a, b) => (a.order || 0) - (b.order || 0)); render(); }

function render() {
  document.getElementById("rows").innerHTML = cats.map((c, idx) => `
    <tr>
      <td><div class="t-actions">
        <button class="mini-btn" data-move="up" data-id="${esc(c.id)}" ${idx === 0 ? "disabled" : ""}>↑</button>
        <button class="mini-btn" data-move="down" data-id="${esc(c.id)}" ${idx === cats.length - 1 ? "disabled" : ""}>↓</button>
      </div></td>
      <td><b>${esc(c.name)}</b></td>
      <td>${esc(c.slug)}</td>
      <td><span class="pill ${c.active === false ? "off" : "on"}">${c.active === false ? "Hidden" : "Visible"}</span></td>
      <td><div class="t-actions">
        <button class="mini-btn" data-act="edit" data-id="${esc(c.id)}">Edit</button>
        <button class="mini-btn danger" data-act="del" data-id="${esc(c.id)}">Delete</button>
      </div></td>
    </tr>`).join("") || `<tr class="empty-row"><td colspan="5">No categories.</td></tr>`;

  document.getElementById("rows").querySelectorAll("[data-act]").forEach((b) =>
    b.onclick = () => { const c = cats.find((x) => x.id === b.dataset.id); b.dataset.act === "edit" ? openEditor(c) : del(c); });
  document.getElementById("rows").querySelectorAll("[data-move]").forEach((b) =>
    b.onclick = () => move(b.dataset.id, b.dataset.move));
}

async function move(id, dir) {
  const i = cats.findIndex((c) => c.id === id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= cats.length) return;
  [cats[i].order, cats[j].order] = [cats[j].order ?? j, cats[i].order ?? i];
  await saveCategory(cats[i]); await saveCategory(cats[j]);
  toast("Reordered"); reload();
}
async function del(c) {
  if (!confirm(`Delete category "${c.name}"?`)) return;
  await deleteCategory(c.id); toast("Deleted"); reload();
}
function openEditor(c) {
  const box = document.getElementById("modalBox");
  box.innerHTML = `
    <span class="close-x" id="closeX">×</span>
    <h2>${c ? "Edit category" : "New category"}</h2>
    <div class="field"><label>Name</label><input id="c-name" value="${esc(c?.name || "")}"></div>
    <div class="field"><label>Slug</label><input id="c-slug" value="${esc(c?.slug || "")}" placeholder="women"></div>
    <div class="field"><label><input type="checkbox" id="c-active" ${c?.active === false ? "" : "checked"}> Visible in navigation</label></div>
    <div style="display:flex;gap:12px;margin-top:20px">
      <button class="btn btn-line" id="cancelBtn">Cancel</button>
      <button class="btn btn-primary" id="saveBtn" style="flex:1">${c ? "Save" : "Create"}</button>
    </div>`;
  document.getElementById("modalBg").classList.add("open");
  document.getElementById("closeX").onclick = close;
  document.getElementById("cancelBtn").onclick = close;
  document.getElementById("saveBtn").onclick = async () => {
    const name = document.getElementById("c-name").value.trim();
    if (!name) { toast("Name required", "err"); return; }
    await saveCategory({
      id: c?.id, name,
      slug: document.getElementById("c-slug").value.trim() || name.toLowerCase(),
      active: document.getElementById("c-active").checked,
      order: c?.order ?? cats.length + 1
    });
    toast("Saved ✦", "ok"); close(); reload();
  };
}
function close() { document.getElementById("modalBg").classList.remove("open"); }
document.getElementById("modalBg").addEventListener("click", (e) => { if (e.target.id === "modalBg") close(); });
