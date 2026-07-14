import { requireAdmin, renderAdminShell } from "./admin-guard.js";
import { usingFirebase } from "./admin-data.js";
import { esc, toast, lsGet, lsSet } from "./utils.js";

(async function () {
  const user = await requireAdmin(); if (!user) return;
  const body = renderAdminShell("settings", user);
  const live = await usingFirebase();
  const s = lsGet("lx-store-settings", { storeName: "LUXORA", currency: "PKR", freeShipOver: 5000, taxRate: 8, email: "care@luxora.example" });

  body.innerHTML = `
    <div class="ad-h"><div><h1>Settings</h1><p>Store configuration</p></div></div>

    <div class="ad-panel">
      <h2>Connection</h2>
      <p style="font-size:.9rem;color:var(--ink-soft)">${live
        ? `<span class="ad-live">● Firebase is connected.</span> Products, orders and images sync live across all visitors.`
        : `<span class="ad-demo">● Demo mode.</span> You're testing without Firebase — changes are saved in this browser only. To go live, paste your Firebase keys into <code>firebase/firebase-config.js</code> and your Cloudinary details for image uploads.`}
      </p>
    </div>

    <div class="ad-panel">
      <h2>Store details</h2>
      <div class="ad-form-grid">
        <div class="field"><label>Store name</label><input id="s-name" value="${esc(s.storeName)}"></div>
        <div class="field"><label>Support email</label><input id="s-email" value="${esc(s.email)}"></div>
        <div class="field"><label>Currency</label><select id="s-cur">
          ${["PKR","USD","EUR","GBP","AED"].map((c) => `<option ${s.currency === c ? "selected" : ""}>${c}</option>`).join("")}</select></div>
        <div class="field"><label>Free shipping over (Rs)</label><input id="s-ship" type="number" value="${s.freeShipOver}"></div>
        <div class="field"><label>Tax rate (%)</label><input id="s-tax" type="number" step="0.1" value="${s.taxRate}"></div>
      </div>
      <button class="btn btn-primary" id="saveBtn">Save settings</button>
    </div>

    <div class="ad-panel">
      <h2>Go live</h2>
      <p style="font-size:.9rem;color:var(--ink-soft);margin-bottom:14px">Once Firebase is connected, push the built-in catalog into Firestore so it's the same for every visitor. After this, manage everything from the Products page.</p>
      <button class="btn btn-primary" id="publishBtn">Publish catalog to Firebase</button>
      <span id="publishNote" style="margin-left:12px;font-size:.86rem"></span>
    </div>

    <div class="ad-panel">
      <h2>Reset demo data</h2>
      <p style="font-size:.9rem;color:var(--ink-soft);margin-bottom:14px">Clears the products, coupons, banners and orders you've created in this browser during demo mode, restoring the built-in catalog.</p>
      <button class="mini-btn danger" id="resetBtn">Reset local demo data</button>
    </div>`;

  document.getElementById("publishBtn").onclick = async () => {
    const note = document.getElementById("publishNote");
    const btn = document.getElementById("publishBtn");
    btn.disabled = true; btn.textContent = "Publishing…";
    try {
      const { publishCatalogToFirestore } = await import("./admin-data.js");
      const n = await publishCatalogToFirestore();
      note.innerHTML = `<span class="ad-live">✓ Published ${n} products to Firestore</span>`;
      toast("Catalog published ✦", "ok");
    } catch (e) {
      note.innerHTML = `<span class="ad-demo">${esc(e.message)}</span>`;
      toast(e.message, "err");
    }
    btn.disabled = false; btn.textContent = "Publish catalog to Firebase";
  };

  document.getElementById("saveBtn").onclick = () => {
    lsSet("lx-store-settings", {
      storeName: document.getElementById("s-name").value.trim(),
      email: document.getElementById("s-email").value.trim(),
      currency: document.getElementById("s-cur").value,
      freeShipOver: parseFloat(document.getElementById("s-ship").value) || 5000,
      taxRate: parseFloat(document.getElementById("s-tax").value) || 0
    });
    toast("Settings saved ✦", "ok");
  };
  document.getElementById("resetBtn").onclick = () => {
    if (!confirm("Reset all local demo data? This can't be undone.")) return;
    ["lx-admin-products", "lx-admin-coupons", "lx-admin-categories", "lx-admin-banners"].forEach((k) => localStorage.removeItem(k));
    for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (k && k.startsWith("lx-orders:")) localStorage.removeItem(k); }
    toast("Demo data reset", "ok"); setTimeout(() => location.reload(), 800);
  };
})();
