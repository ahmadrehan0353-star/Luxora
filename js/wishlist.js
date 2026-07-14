// ============================================================
// LUXORA — wishlist page
// ============================================================
import { renderNavbar } from "./navbar.js";
import { renderFooter, initReveal } from "./app.js";
import { loadProducts } from "./products.js";
import { renderGrid } from "./product-card.js";
import { lsGet } from "./utils.js";

async function boot() {
  renderNavbar(""); renderFooter();
  const all = await loadProducts();
  const wish = lsGet("lx-wish", []);
  const items = all.filter((p) => wish.includes(p.id));
  const root = document.getElementById("wishRoot");

  if (!items.length) {
    root.innerHTML = `
      <div class="wish-empty">
        <b>Your wishlist is empty</b>
        <p class="muted">Tap the heart on any piece to save it here.</p>
        <a class="btn btn-primary" href="women.html" style="margin-top:20px">Explore the collection</a>
      </div>`;
    return;
  }
  root.innerHTML = `<div class="p-grid" id="wishGrid"></div>`;
  renderGrid("wishGrid", items);
  initReveal();
}
boot();
