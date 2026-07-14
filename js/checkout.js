// ============================================================
// LUXORA — checkout flow: address → shipping → payment → review
// ============================================================
import { renderNavbar, refreshCounts } from "./navbar.js";
import { renderFooter } from "./app.js";
import { loadProducts } from "./products.js";
import { currentUser, getProfile, placeOrder } from "./auth.js";
import { money, esc, lsGet, lsSet, toast, isEmail, isNonEmpty } from "./utils.js";

const SHIP_FREE_OVER = 5000, TAX_RATE = 0.0;
const SHIPPING = {
  standard: { label: "Standard", desc: "3–5 business days", price: 200 },
  express:  { label: "Express",  desc: "1–2 business days", price: 400 }
};
const COUPONS = { LUXE10:{type:"percent",value:10}, WELCOME15:{type:"percent",value:15}, SAVE20:{type:"fixed",value:500} };

let products = [], user = null, step = 1;
const order = { address: {}, shipping: "standard", payment: "cod" };

async function boot() {
  renderNavbar(""); renderFooter();
  products = await loadProducts();

  const cart = lsGet("lx-cart", []);
  if (!cart.length) { location.href = "cart.html"; return; }

  user = await currentUser();
  if (user) {
    const prof = await getProfile(user);
    if (prof?.addresses?.length) order.address = { ...prof.addresses[0] };
    order.address.email = order.address.email || user.email;
    order.address.name = order.address.name || user.displayName || prof?.name || "";
  }
  render();
}

function cartLines() {
  const cart = lsGet("lx-cart", []);
  return cart.map((l) => ({ ...l, p: products.find((x) => x.id === l.pid) })).filter((l) => l.p);
}
function totals() {
  const lines = cartLines();
  let subtotal = 0;
  lines.forEach((l) => subtotal += (l.p.salePrice || l.p.price) * l.qty);
  const code = lsGet("lx-coupon", null);
  let discount = 0;
  if (code && COUPONS[code]) {
    const c = COUPONS[code];
    discount = c.type === "percent" ? subtotal * c.value / 100 : Math.min(c.value, subtotal);
  }
  const afterDiscount = Math.max(0, subtotal - discount);
  const ship = SHIPPING[order.shipping].price;
  const shipping = afterDiscount >= SHIP_FREE_OVER && order.shipping === "standard" ? 0 : ship;
  const tax = afterDiscount * TAX_RATE;
  return { subtotal, discount, shipping, tax, total: afterDiscount + shipping + tax };
}

function stepBar() {
  const names = ["Address", "Shipping", "Payment", "Review"];
  return `<div class="steps">${names.map((n, i) => {
    const s = i + 1;
    return `<div class="step ${s === step ? "on" : ""} ${s < step ? "done" : ""}">${s < step ? "✓ " : ""}${n}</div>`;
  }).join("")}</div>`;
}

function summaryAside() {
  const t = totals();
  const lines = cartLines();
  return `<aside class="summary">
    <h3>Your order</h3>
    ${lines.map((l) => `<div class="co-review-item"><span>${esc(l.p.name)} <span class="muted">×${l.qty}</span></span><span>${money((l.p.salePrice||l.p.price)*l.qty)}</span></div>`).join("")}
    <div class="sum-row" style="margin-top:12px"><span>Subtotal</span><span>${money(t.subtotal)}</span></div>
    ${t.discount ? `<div class="sum-row" style="color:var(--ok)"><span>Discount</span><span>−${money(t.discount)}</span></div>` : ""}
    <div class="sum-row muted"><span>Shipping</span><span>${t.shipping === 0 ? "Free" : money(t.shipping)}</span></div>
    <div class="sum-row muted"><span>Tax</span><span>${money(t.tax)}</span></div>
    <div class="sum-total"><span>Total</span><span>${money(t.total)}</span></div>
  </aside>`;
}

function render() {
  const root = document.getElementById("checkoutRoot");
  root.innerHTML = `<div class="checkout"><div>${stepBar()}<div id="stepBody"></div></div>${summaryAside()}</div>`;
  const body = document.getElementById("stepBody");
  if (step === 1) body.innerHTML = addressStep();
  if (step === 2) body.innerHTML = shippingStep();
  if (step === 3) body.innerHTML = paymentStep();
  if (step === 4) body.innerHTML = reviewStep();
  wireStep();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---- step 1: address ---- */
function addressStep() {
  const a = order.address;
  return `<div class="co-section">
    <h3>Shipping address</h3>
    <div class="form-2">
      <div class="field"><label>Full name</label><input id="f-name" value="${esc(a.name||"")}" autocomplete="name"></div>
      <div class="field"><label>Email</label><input id="f-email" type="email" value="${esc(a.email||"")}" autocomplete="email"></div>
    </div>
    <div class="field"><label>Address</label><input id="f-street" value="${esc(a.street||"")}" autocomplete="street-address" placeholder="Street address"></div>
    <div class="form-2">
      <div class="field"><label>City</label><input id="f-city" value="${esc(a.city||"")}" autocomplete="address-level2"></div>
      <div class="field"><label>Postal code</label><input id="f-zip" value="${esc(a.zip||"")}" autocomplete="postal-code"></div>
    </div>
    <div class="form-2">
      <div class="field"><label>Country</label><input id="f-country" value="${esc(a.country||"")}" autocomplete="country-name"></div>
      <div class="field"><label>Phone</label><input id="f-phone" value="${esc(a.phone||"")}" autocomplete="tel"></div>
    </div>
    <button class="btn btn-primary" id="toShipping">Continue to shipping</button>
  </div>`;
}
/* ---- step 2: shipping ---- */
function shippingStep() {
  return `<div class="co-section">
    <h3>Shipping method</h3>
    <div class="pay-methods">
      ${Object.entries(SHIPPING).map(([k, s]) => `
        <label class="pay-opt ${order.shipping === k ? "on" : ""}">
          <input type="radio" name="ship" value="${k}" ${order.shipping === k ? "checked" : ""}>
          <div style="flex:1"><div class="pay-name">${s.label}</div><div class="pay-desc">${s.desc}</div></div>
          <div style="font-weight:600">${s.price === 0 ? "Free" : money(s.price)}</div>
        </label>`).join("")}
    </div>
    <div style="display:flex;gap:12px;margin-top:24px">
      <button class="btn btn-line" id="backTo1">Back</button>
      <button class="btn btn-primary" id="toPayment" style="flex:1">Continue to payment</button>
    </div>
  </div>`;
}
/* ---- step 3: payment ---- */
function paymentStep() {
  const methods = [
    { k: "cod", name: "Cash on delivery", desc: "Pay in cash when your order arrives at your door" }
  ];
  return `<div class="co-section">
    <h3>Payment</h3>
    <div class="pay-methods">
      ${methods.map((m) => `
        <label class="pay-opt on">
          <input type="radio" name="pay" value="${m.k}" checked>
          <div style="flex:1"><div class="pay-name">${m.name}</div><div class="pay-desc">${m.desc}</div></div>
        </label>`).join("")}
    </div>
    <p class="muted" style="font-size:.82rem;margin-top:14px">💵 Pay in cash when your order is delivered. Please keep the exact amount ready.</p>
    <div style="display:flex;gap:12px;margin-top:24px">
      <button class="btn btn-line" id="backTo2">Back</button>
      <button class="btn btn-primary" id="toReview" style="flex:1">Review order</button>
    </div>
  </div>`;
}
/* ---- step 4: review ---- */
function reviewStep() {
  const a = order.address;
  return `<div class="co-section">
    <h3>Review &amp; place order</h3>
    <div class="acct-card">
      <b>Ship to</b>
      <p class="muted" style="margin-top:6px">${esc(a.name)}<br>${esc(a.street)}, ${esc(a.city)} ${esc(a.zip)}<br>${esc(a.country)} · ${esc(a.phone)}</p>
    </div>
    <div class="acct-card">
      <b>Method</b>
      <p class="muted" style="margin-top:6px">${SHIPPING[order.shipping].label} shipping · Cash on delivery</p>
    </div>
    <div style="display:flex;gap:12px;margin-top:8px">
      <button class="btn btn-line" id="backTo3">Back</button>
      <button class="btn btn-gold" id="placeBtn" style="flex:1">Place order · ${money(totals().total)}</button>
    </div>
  </div>`;
}

function wireStep() {
  const $ = (id) => document.getElementById(id);

  if (step === 1) $("toShipping").onclick = () => {
    const a = {
      name: $("f-name").value.trim(), email: $("f-email").value.trim(),
      street: $("f-street").value.trim(), city: $("f-city").value.trim(),
      zip: $("f-zip").value.trim(), country: $("f-country").value.trim(),
      phone: $("f-phone").value.trim()
    };
    if (!isNonEmpty(a.name) || !isNonEmpty(a.street) || !isNonEmpty(a.city) || !isNonEmpty(a.country)) {
      toast("Please fill in your name and address", "err"); return;
    }
    if (!isEmail(a.email)) { toast("Please enter a valid email", "err"); return; }
    order.address = a; step = 2; render();
  };

  if (step === 2) {
    $("backTo1").onclick = () => { step = 1; render(); };
    document.querySelectorAll('input[name="ship"]').forEach((r) =>
      r.addEventListener("change", (e) => { order.shipping = e.target.value; render(); }));
    $("toPayment").onclick = () => { step = 3; render(); };
  }

  if (step === 3) {
    $("backTo2").onclick = () => { step = 2; render(); };
    order.payment = "cod";
    $("toReview").onclick = () => { step = 4; render(); };
  }

  if (step === 4) {
    $("backTo3").onclick = () => { step = 3; render(); };
    $("placeBtn").onclick = async () => {
      const btn = $("placeBtn"); btn.disabled = true; btn.textContent = "Placing order…";
      const t = totals();
      const items = cartLines().map((l) => ({
        pid: l.p.id, name: l.p.name, price: l.p.salePrice || l.p.price,
        qty: l.qty, color: l.color, size: l.size, image: l.p.image
      }));
      try {
        const rec = await placeOrder(user, {
          items, address: order.address, shipping: order.shipping,
          payment: order.payment, totals: t
        });
        // clear cart + coupon
        lsSet("lx-cart", []); lsSet("lx-coupon", null); refreshCounts();
        // stash for the confirmation screen
        sessionStorage.setItem("lx-last-order", JSON.stringify({ id: rec.id, email: order.address.email, total: t.total }));
        location.href = "checkout.html?done=1";
      } catch (e) {
        toast(e.message || "Could not place order", "err");
        btn.disabled = false; btn.textContent = "Place order";
      }
    };
  }
}

/* ---- confirmation screen ---- */
function showConfirmation() {
  renderNavbar(""); renderFooter();
  let info = {};
  try { info = JSON.parse(sessionStorage.getItem("lx-last-order")) || {}; } catch {}
  document.getElementById("checkoutRoot").innerHTML = `
    <div class="confirm">
      <div class="tick"><svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></div>
      <h1>Thank you for your order</h1>
      <p>Your order <span class="order-id">${esc(info.id || "LX——")}</span> is confirmed.</p>
      <p>A confirmation has been sent to <b>${esc(info.email || "your email")}</b>.</p>
      ${info.total != null ? `<p>Total charged: <b>${money(info.total)}</b></p>` : ""}
      <a class="btn btn-primary" href="profile.html">View my orders</a>
      <a class="btn btn-line" href="women.html" style="margin-top:10px">Continue shopping</a>
    </div>`;
}

if (new URLSearchParams(location.search).get("done")) showConfirmation();
else boot();
