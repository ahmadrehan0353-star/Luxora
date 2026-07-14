// ============================================================
// LUXORA — account / profile page
// ============================================================
import { renderNavbar } from "./navbar.js";
import { renderFooter } from "./app.js";
import { onUser, getProfile, saveAddresses, getOrders, logOut } from "./auth.js";
import { loadProducts } from "./products.js";
import { renderGrid } from "./product-card.js";
import { money, esc, lsGet, toast } from "./utils.js";

let user = null, profile = null, products = [];

async function boot() {
  renderNavbar(""); renderFooter();
  products = await loadProducts();

  onUser(async (u) => {
    if (!u) { location.href = "login.html?next=profile.html"; return; }
    user = u;
    profile = await getProfile(u);
    render();
  });
}

function render() {
  document.getElementById("acctRoot").innerHTML = `
    <div class="wrap acct">
      <nav class="acct-nav">
        <button class="on" data-tab="overview">Overview</button>
        <button data-tab="orders">Orders</button>
        <button data-tab="addresses">Addresses</button>
        <button data-tab="recent">Recently viewed</button>
        <button data-tab="wishlist">Wishlist</button>
        <button id="logoutBtn" style="color:var(--err)">Sign out</button>
      </nav>
      <div>
        <h1 class="acct-greeting">Hello, ${esc((user.displayName || profile?.name || "there").split(" ")[0])}</h1>
        <div class="acct-email">${esc(user.email)}</div>
        <div class="acct-panel on" id="tab-overview"></div>
        <div class="acct-panel" id="tab-orders"></div>
        <div class="acct-panel" id="tab-addresses"></div>
        <div class="acct-panel" id="tab-recent"></div>
        <div class="acct-panel" id="tab-wishlist"></div>
      </div>
    </div>`;

  wireTabs();
  overview();
  document.getElementById("logoutBtn").onclick = async () => {
    await logOut(); toast("Signed out"); setTimeout(() => location.href = "index.html", 400);
  };
}

function wireTabs() {
  const btns = document.querySelectorAll(".acct-nav [data-tab]");
  btns.forEach((b) => b.onclick = () => {
    btns.forEach((x) => x.classList.remove("on"));
    b.classList.add("on");
    document.querySelectorAll(".acct-panel").forEach((p) => p.classList.remove("on"));
    document.getElementById("tab-" + b.dataset.tab).classList.add("on");
    if (b.dataset.tab === "orders") orders();
    if (b.dataset.tab === "addresses") addresses();
    if (b.dataset.tab === "recent") recent();
    if (b.dataset.tab === "wishlist") wishlist();
  });
}

async function overview() {
  const list = await getOrders(user);
  const wish = lsGet("lx-wish", []);
  document.getElementById("tab-overview").innerHTML = `
    <div class="acct-card">
      <h3>Account overview</h3>
      <p class="muted">You have <b>${list.length}</b> order${list.length === 1 ? "" : "s"}, <b>${wish.length}</b> saved item${wish.length === 1 ? "" : "s"}, and <b>${(profile?.addresses || []).length}</b> saved address${(profile?.addresses || []).length === 1 ? "" : "es"}.</p>
    </div>
    <div class="acct-card">
      <h3>Recent order</h3>
      ${list.length ? orderRow(list[0]) : `<p class="muted">No orders yet. <a href="women.html" style="text-decoration:underline">Start shopping</a>.</p>`}
    </div>`;
}

function orderRow(o) {
  const items = o.items || [];
  const total = o.totals?.total ?? 0;
  const status = o.status || "pending";
  const date = o.createdAt?.seconds
    ? new Date(o.createdAt.seconds * 1000).toLocaleDateString()
    : (o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "");
  return `<div class="order-row">
    <div class="order-top">
      <div><b>${esc(o.id)}</b><br><span class="muted">${date}</span></div>
      <div style="text-align:right">
        <span class="badge ${esc(status)}">${esc(status)}</span><br>
        <b style="font-size:.95rem">${money(total)}</b>
      </div>
    </div>
    <div class="order-items">
      ${items.slice(0, 5).map((i) => `<img src="${esc(i.image)}" alt="${esc(i.name)}" title="${esc(i.name)} ×${i.qty}">`).join("")}
      ${items.length > 5 ? `<span class="muted" style="align-self:center">+${items.length - 5}</span>` : ""}
    </div>
  </div>`;
}

async function orders() {
  const list = await getOrders(user);
  document.getElementById("tab-orders").innerHTML = list.length
    ? `<div class="acct-card"><h3>Order history</h3>${list.map(orderRow).join("")}</div>`
    : `<div class="acct-card"><h3>Order history</h3><p class="muted">No orders yet.</p></div>`;
}

function addresses() {
  const list = profile?.addresses || [];
  document.getElementById("tab-addresses").innerHTML = `
    <div class="acct-card">
      <h3>Saved addresses</h3>
      <div class="addr-grid" id="addrGrid">
        ${list.length ? list.map((a, i) => `
          <div class="addr-card">
            <button class="rm" data-i="${i}">Remove</button>
            <b>${esc(a.name || "")}</b><br>${esc(a.street || "")}<br>${esc(a.city || "")} ${esc(a.zip || "")}<br>${esc(a.country || "")}<br>${esc(a.phone || "")}
          </div>`).join("") : `<p class="muted">No saved addresses yet.</p>`}
      </div>
    </div>
    <div class="acct-card">
      <h3>Add an address</h3>
      <div class="form-2">
        <div class="field"><label>Full name</label><input id="a-name"></div>
        <div class="field"><label>Phone</label><input id="a-phone"></div>
      </div>
      <div class="field"><label>Street</label><input id="a-street"></div>
      <div class="form-2">
        <div class="field"><label>City</label><input id="a-city"></div>
        <div class="field"><label>Postal code</label><input id="a-zip"></div>
      </div>
      <div class="field"><label>Country</label><input id="a-country"></div>
      <button class="btn btn-primary" id="addAddr">Save address</button>
    </div>`;

  const grid = document.getElementById("addrGrid");
  grid.addEventListener("click", async (e) => {
    const b = e.target.closest(".rm"); if (!b) return;
    const list2 = profile.addresses || [];
    list2.splice(+b.dataset.i, 1);
    await saveAddresses(user, list2); profile.addresses = list2; addresses(); toast("Address removed");
  });
  document.getElementById("addAddr").onclick = async () => {
    const a = {
      name: v("a-name"), phone: v("a-phone"), street: v("a-street"),
      city: v("a-city"), zip: v("a-zip"), country: v("a-country")
    };
    if (!a.name || !a.street || !a.city) { toast("Fill in name, street and city", "err"); return; }
    const list3 = profile.addresses || [];
    list3.push(a);
    await saveAddresses(user, list3); profile.addresses = list3; addresses(); toast("Address saved ✦", "ok");
  };
  function v(id) { return document.getElementById(id).value.trim(); }
}

function recent() {
  const ids = lsGet("lx-recent", []);
  const items = ids.map((id) => products.find((p) => p.id === id)).filter(Boolean);
  const el = document.getElementById("tab-recent");
  if (!items.length) { el.innerHTML = `<div class="acct-card"><h3>Recently viewed</h3><p class="muted">Nothing here yet.</p></div>`; return; }
  el.innerHTML = `<div class="acct-card"><h3>Recently viewed</h3></div><div class="p-grid" id="recentGrid"></div>`;
  renderGrid("recentGrid", items);
}

function wishlist() {
  const ids = lsGet("lx-wish", []);
  const items = products.filter((p) => ids.includes(p.id));
  const el = document.getElementById("tab-wishlist");
  if (!items.length) { el.innerHTML = `<div class="acct-card"><h3>Wishlist</h3><p class="muted">No saved items. <a href="women.html" style="text-decoration:underline">Browse</a>.</p></div>`; return; }
  el.innerHTML = `<div class="acct-card"><h3>Wishlist</h3></div><div class="p-grid" id="wishGridAcct"></div>`;
  renderGrid("wishGridAcct", items);
}

boot();
