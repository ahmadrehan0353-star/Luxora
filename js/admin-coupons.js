import { requireAdmin, renderAdminShell } from "./admin-guard.js";
import { listCoupons, saveCoupon, deleteCoupon } from "./admin-data.js";
import { money, esc, toast } from "./utils.js";

let coupons = [];
(async function () {
  const user = await requireAdmin(); if (!user) return;
  const body = renderAdminShell("coupons", user);
  body.innerHTML = `
    <div class="ad-h"><div><h1>Coupons</h1><p>Discount codes customers can apply at checkout</p></div>
      <button class="btn btn-primary" id="newBtn">+ New coupon</button></div>
    <div class="ad-panel" style="padding:0;overflow-x:auto">
      <table class="ad-table"><thead><tr><th>Code</th><th>Discount</th><th>Expiry</th><th>Usage</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody id="rows"></tbody></table>
    </div>`;
  document.getElementById("newBtn").onclick = () => openEditor(null);
  await reload();
})();

async function reload() { coupons = await listCoupons(); render(); }
function render() {
  document.getElementById("rows").innerHTML = coupons.map((c) => `
    <tr>
      <td><b>${esc(c.code)}</b></td>
      <td>${c.type === "percent" ? c.value + "% off" : money(c.value) + " off"}</td>
      <td>${esc(c.expiry || "—")}</td>
      <td>${c.used ?? 0}${c.limit ? " / " + c.limit : ""}</td>
      <td><span class="pill ${c.active === false ? "off" : "on"}">${c.active === false ? "Inactive" : "Active"}</span></td>
      <td><div class="t-actions">
        <button class="mini-btn" data-act="edit" data-id="${esc(c.id)}">Edit</button>
        <button class="mini-btn danger" data-act="del" data-id="${esc(c.id)}">Delete</button>
      </div></td>
    </tr>`).join("") || `<tr class="empty-row"><td colspan="6">No coupons yet.</td></tr>`;
  document.getElementById("rows").querySelectorAll("[data-act]").forEach((b) =>
    b.onclick = () => { const c = coupons.find((x) => x.id === b.dataset.id); b.dataset.act === "edit" ? openEditor(c) : del(c); });
}
async function del(c) { if (!confirm(`Delete coupon ${c.code}?`)) return; await deleteCoupon(c.id); toast("Deleted"); reload(); }

function openEditor(c) {
  const box = document.getElementById("modalBox");
  box.innerHTML = `
    <span class="close-x" id="closeX">×</span>
    <h2>${c ? "Edit coupon" : "New coupon"}</h2>
    <div class="ad-form-grid">
      <div class="field"><label>Code</label><input id="c-code" value="${esc(c?.code || "")}" placeholder="SUMMER20" style="text-transform:uppercase"></div>
      <div class="field"><label>Type</label><select id="c-type">
        <option value="percent" ${c?.type === "percent" ? "selected" : ""}>Percentage</option>
        <option value="fixed" ${c?.type === "fixed" ? "selected" : ""}>Fixed amount</option></select></div>
      <div class="field"><label>Value</label><input id="c-value" type="number" min="0" value="${c?.value ?? ""}"></div>
      <div class="field"><label>Expiry date</label><input id="c-expiry" type="date" value="${esc(c?.expiry || "")}"></div>
      <div class="field"><label>Usage limit</label><input id="c-limit" type="number" min="0" value="${c?.limit ?? ""}"></div>
      <div class="field"><label>Times used</label><input id="c-used" type="number" min="0" value="${c?.used ?? 0}"></div>
    </div>
    <div class="field"><label><input type="checkbox" id="c-active" ${c?.active === false ? "" : "checked"}> Active</label></div>
    <div style="display:flex;gap:12px;margin-top:18px">
      <button class="btn btn-line" id="cancelBtn">Cancel</button>
      <button class="btn btn-primary" id="saveBtn" style="flex:1">${c ? "Save" : "Create"}</button>
    </div>`;
  document.getElementById("modalBg").classList.add("open");
  document.getElementById("closeX").onclick = close;
  document.getElementById("cancelBtn").onclick = close;
  document.getElementById("saveBtn").onclick = async () => {
    const code = document.getElementById("c-code").value.trim().toUpperCase();
    const value = parseFloat(document.getElementById("c-value").value);
    if (!code || isNaN(value)) { toast("Code and value required", "err"); return; }
    await saveCoupon({
      id: c?.id || code, code, type: document.getElementById("c-type").value, value,
      expiry: document.getElementById("c-expiry").value,
      limit: parseInt(document.getElementById("c-limit").value) || null,
      used: parseInt(document.getElementById("c-used").value) || 0,
      active: document.getElementById("c-active").checked
    });
    toast("Saved ✦", "ok"); close(); reload();
  };
}
function close() { document.getElementById("modalBg").classList.remove("open"); }
document.getElementById("modalBg").addEventListener("click", (e) => { if (e.target.id === "modalBg") close(); });
