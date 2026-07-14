// ============================================================
// LUXORA — shared footer + global boot (used on every page)
// ============================================================
import { toast, isEmail } from "./utils.js";

export function renderFooter() {
  const mount = document.getElementById("footer");
  if (!mount) return;
  mount.innerHTML = `
  <footer class="ft">
    <div class="wrap ft-top">
      <div class="ft-col ft-brand">
        <div class="ft-logo">LUX<span>O</span>RA</div>
        <p>Modern luxury, made to be lived in. Considered fashion for women, men and kids — crafted from quality materials, designed to last.</p>
        <ul class="ft-contact">
          <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4z"/><path d="M4 7l8 6 8-6"/></svg><a href="mailto:care@luxora.example">care@luxora.example</a></li>
          <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.5 2.1L8 9.7a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.7 2Z"/></svg><a href="tel:+923000000000">+92 300 0000000 <span class="ft-edit">(edit me)</span></a></li>
          <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.4"/></svg><span>Your store address, Rawalpindi, Pakistan <span class="ft-edit">(edit me)</span></span></li>
        </ul>
        <div class="ft-social">
          <a href="#" aria-label="Instagram" target="_blank" rel="noopener"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="#fff" stroke="none"/></svg></a>
          <a href="#" aria-label="Facebook" target="_blank" rel="noopener"><svg viewBox="0 0 24 24"><path d="M15 8h-2a2 2 0 0 0-2 2v10M8 12h6"/></svg></a>
          <a href="#" aria-label="TikTok" target="_blank" rel="noopener"><svg viewBox="0 0 24 24"><path d="M9 12a4 4 0 1 0 4 4V4c1 2 2.5 3 5 3"/></svg></a>
        </div>
      </div>
      <div class="ft-col">
        <h4>Shop</h4>
        <a href="women.html">Women</a><a href="men.html">Men</a><a href="kids.html">Kids</a><a href="index.html#new">New Arrivals</a>
      </div>
      <div class="ft-col">
        <h4>Company</h4>
        <a href="about.html">About Us</a>
        <a href="contact.html">Contact</a>
        <a href="faq.html">FAQ</a>
        <a href="profile.html">Track Order</a>
      </div>
      <div class="ft-col">
        <h4>Policies</h4>
        <a href="shipping-policy.html">Shipping Policy</a>
        <a href="refund-policy.html">Refund Policy</a>
        <a href="privacy-policy.html">Privacy Policy</a>
        <a href="terms.html">Terms &amp; Conditions</a>
      </div>
      <div class="ft-col ft-news">
        <h4>The LUXORA List</h4>
        <p>Early access, private sales and 10% off your first order.</p>
        <form class="ft-form" id="ftNews">
          <input type="email" placeholder="Email address" aria-label="Email address" required>
          <button type="submit">Join</button>
        </form>
      </div>
    </div>
    <div class="wrap ft-bar">
      <span>© 2026 LUXORA. All rights reserved.</span>
      <div class="ft-pay"><span>Cash on Delivery</span></div>
    </div>
  </footer>`;

  const nf = document.getElementById("ftNews");
  nf.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = nf.querySelector("input").value;
    if (!isEmail(v)) { toast("Enter a valid email", "err"); return; }
    nf.reset(); toast("Welcome to the LUXORA List ✦", "ok");
  });
}

// scroll reveal (shared)
export function initReveal() {
  const els = document.querySelectorAll(".reveal, .p-grid");
  if (els.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.08 });
    els.forEach((el) => io.observe(el));
  }
  // navbar shadow on scroll — a subtle premium lift
  const nav = document.querySelector("header.nav");
  if (nav) {
    const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }
}
