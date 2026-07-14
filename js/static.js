// ============================================================
// LUXORA — boot script for static content pages
// (About, Contact, FAQ, Shipping/Refund/Privacy Policy, Terms)
// Kept separate so these simple pages don't need a bespoke
// controller each, avoiding duplicate boot code across files.
// ============================================================
import { renderNavbar } from "./navbar.js";
import { renderFooter, initReveal } from "./app.js";
import { toast, isEmail } from "./utils.js";

renderNavbar("");
renderFooter();
initReveal();

// optional contact form (present only on contact.html)
const cf = document.getElementById("contactForm");
if (cf) {
  cf.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("cf-email").value.trim();
    const msg = document.getElementById("cf-message").value.trim();
    if (!isEmail(email)) { toast("Enter a valid email", "err"); return; }
    if (!msg) { toast("Please write a short message", "err"); return; }
    cf.reset();
    toast("Message sent — we'll reply within 1–2 business days", "ok");
  });
}
