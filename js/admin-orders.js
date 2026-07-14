import { requireAdmin, renderAdminShell } from "./admin-guard.js";
import { adminListOrders, adminUpdateOrderStatus } from "./admin-data.js";
import { money, esc, toast } from "./utils.js";

const STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"];
let orders = [];

(async function () {
  const user = await requireAdmin(); if (!user) return;
  const body = renderAdminShell("orders", user);
  body.innerHTML = `
    <div class="ad-h"><div><h1>Orders</h1><p>Track and update every order</p></div></div>
    <div class="ad-toolbar">
      <input class="ad-search" id="search" placeholder="Search by order id, name or email…">
      <select class="ad-select" id="statusFilter"><option value="">All statuses</option>
        ${STATUSES.map((s) => `<option value="${s}">${s[0].toUpperCase()+s.slice(1)}</option>`).join("")}</select>
    </div>
    <div class="ad-panel" style="padding:0;overflow-x:auto">
      <table class="ad-table"><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Date</th><th>Status</th></tr></thead>
      <tbody id="rows"></tbody></table>
    </div>`;
  document.getElementById("search").oninput = render;
  document.getElementById("statusFilter").onchange = render;
  orders = await adminListOrders();
  render();
})();

function render() {
  const q = (document.getElementById("search").value || "").toLowerCase();
  const st = document.getElementById("statusFilter").value;
  const list = orders.filter((o) =>
    (!q || (o.id + (o.address?.name || "") + (o.email || "")).toLowerCase().includes(q)) &&
    (!st || (o.status || "pending") === st));

  document.getElementById("rows").innerHTML = list.map((o) => {
    const date = o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000).toLocaleDateString()
      : (o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "—");
    const items = (o.items || []).reduce((s, i) => s + i.qty, 0);
    return `<tr>
      <td><b>${esc(o.id)}</b></td>
      <td>${esc(o.address?.name || "Guest")}<br><span class="muted" style="font-size:.78rem">${esc(o.email || "")}</span></td>
      <td>${items} item${items === 1 ? "" : "s"}</td>
      <td>${money(o.totals?.total || 0)}</td>
      <td>${date}</td>
      <td><select class="status-sel" data-id="${esc(o.id)}">
        ${STATUSES.map((s) => `<option value="${s}" ${(o.status || "pending") === s ? "selected" : ""}>${s[0].toUpperCase()+s.slice(1)}</option>`).join("")}
      </select></td>
    </tr>`;
  }).join("") || `<tr class="empty-row"><td colspan="6">No orders match.</td></tr>`;

  document.getElementById("rows").querySelectorAll(".status-sel").forEach((sel) => {
    sel.onchange = async () => {
      await adminUpdateOrderStatus(sel.dataset.id, sel.value);
      const o = orders.find((x) => x.id === sel.dataset.id); if (o) o.status = sel.value;
      toast("Order updated ✦", "ok");
    };
  });
}
