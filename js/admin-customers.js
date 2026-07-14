import { requireAdmin, renderAdminShell } from "./admin-guard.js";
import { adminListCustomers, adminSetBanned } from "./admin-data.js";
import { money, esc, toast } from "./utils.js";

let customers = [];

(async function () {
  const user = await requireAdmin(); if (!user) return;
  const body = renderAdminShell("customers", user);
  customers = await adminListCustomers();

  body.innerHTML = `
    <div class="ad-h"><div><h1>Customers</h1><p>${customers.length} customers</p></div></div>
    <div class="ad-toolbar"><input class="ad-search" id="search" placeholder="Search customers…"></div>
    <div class="ad-panel" style="padding:0;overflow-x:auto">
      <table class="ad-table"><thead><tr><th>Name</th><th>Email</th><th>Orders</th><th>Total spent</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody id="rows"></tbody></table>
    </div>`;
  document.getElementById("search").oninput = render;
  render();
})();

function render() {
  const q = (document.getElementById("search").value || "").toLowerCase();
  const list = customers.filter((c) => ((c.name || "") + (c.email || "")).toLowerCase().includes(q));
  document.getElementById("rows").innerHTML = list.map((c) => `
    <tr>
      <td><b>${esc(c.name || "—")}</b></td>
      <td>${esc(c.email)}</td>
      <td>${c.orders ?? 0}</td>
      <td>${money(c.spent || 0)}</td>
      <td><span class="pill ${c.banned ? "off" : "on"}">${c.banned ? "Banned" : "Active"}</span></td>
      <td><div class="t-actions">
        <button class="mini-btn ${c.banned ? "" : "danger"}" data-email="${esc(c.email)}" data-uid="${esc(c.uid || "")}" data-ban="${c.banned ? "unban" : "ban"}">${c.banned ? "Unban" : "Ban"}</button>
      </div></td>
    </tr>`).join("") || `<tr class="empty-row"><td colspan="6">No customers yet.</td></tr>`;

  document.getElementById("rows").querySelectorAll("[data-ban]").forEach((b) =>
    b.onclick = async () => {
      const ban = b.dataset.ban === "ban";
      if (ban && !confirm(`Ban ${b.dataset.email}? They won't be able to sign in.`)) return;
      await adminSetBanned(b.dataset.email, ban, b.dataset.uid || null);
      const c = customers.find((x) => x.email === b.dataset.email); if (c) c.banned = ban;
      toast(ban ? "Customer banned" : "Customer unbanned", ban ? "err" : "ok");
      render();
    });
}
