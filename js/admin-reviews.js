import { requireAdmin, renderAdminShell } from "./admin-guard.js";
import { adminListReviews, adminSaveReview, adminDeleteReview } from "./admin-data.js";
import { esc, toast } from "./utils.js";

let reviews = [];
const stars = (r) => "★★★★★".slice(0, r) + "☆☆☆☆☆".slice(0, 5 - r);

(async function () {
  const user = await requireAdmin(); if (!user) return;
  const body = renderAdminShell("reviews", user);
  body.innerHTML = `
    <div class="ad-h"><div><h1>Reviews</h1><p>Approve, reject, reply to or delete customer reviews</p></div></div>
    <div class="ad-toolbar">
      <input class="ad-search" id="search" placeholder="Search reviews…">
      <select class="ad-select" id="statusFilter"><option value="">All</option>
        <option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select>
    </div>
    <div class="ad-panel" style="padding:0;overflow-x:auto">
      <table class="ad-table"><thead><tr><th>Product</th><th>Reviewer</th><th>Rating</th><th>Review</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody id="rows"></tbody></table>
    </div>`;
  document.getElementById("search").oninput = render;
  document.getElementById("statusFilter").onchange = render;
  reviews = await adminListReviews();
  render();
})();

function render() {
  const q = (document.getElementById("search").value || "").toLowerCase();
  const st = document.getElementById("statusFilter").value;
  const list = reviews.filter((r) =>
    (!q || (r.name + r.text + r.productId).toLowerCase().includes(q)) &&
    (!st || (r.status || "pending") === st));

  document.getElementById("rows").innerHTML = list.map((r) => `
    <tr>
      <td>${esc(r.productId)}</td>
      <td><b>${esc(r.name)}</b></td>
      <td><span style="color:var(--gold)">${stars(r.rating)}</span></td>
      <td style="max-width:280px">${esc(r.text)}${r.reply ? `<br><span class="muted" style="font-size:.8rem">↳ Reply: ${esc(r.reply)}</span>` : ""}</td>
      <td><span class="pill ${r.status === "approved" ? "on" : r.status === "rejected" ? "off" : "feat"}">${esc(r.status || "pending")}</span></td>
      <td><div class="t-actions">
        ${r.status !== "approved" ? `<button class="mini-btn gold" data-act="approve" data-id="${esc(r.id)}">Approve</button>` : ""}
        ${r.status !== "rejected" ? `<button class="mini-btn" data-act="reject" data-id="${esc(r.id)}">Reject</button>` : ""}
        <button class="mini-btn" data-act="reply" data-id="${esc(r.id)}">Reply</button>
        <button class="mini-btn danger" data-act="del" data-id="${esc(r.id)}">Delete</button>
      </div></td>
    </tr>`).join("") || `<tr class="empty-row"><td colspan="6">No reviews.</td></tr>`;

  document.getElementById("rows").querySelectorAll("[data-act]").forEach((b) =>
    b.onclick = () => action(b.dataset.act, b.dataset.id));
}

async function action(act, id) {
  const r = reviews.find((x) => x.id === id);
  if (act === "approve") { r.status = "approved"; await adminSaveReview({ id, status: "approved" }); toast("Approved ✦", "ok"); }
  if (act === "reject") { r.status = "rejected"; await adminSaveReview({ id, status: "rejected" }); toast("Rejected"); }
  if (act === "del") { if (!confirm("Delete this review?")) return; await adminDeleteReview(id); reviews = reviews.filter((x) => x.id !== id); toast("Deleted"); }
  if (act === "reply") {
    const reply = prompt("Your reply to this review:", r.reply || "");
    if (reply === null) return;
    r.reply = reply; await adminSaveReview({ id, reply }); toast("Reply saved ✦", "ok");
  }
  render();
}
