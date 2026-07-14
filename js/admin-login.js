import { logIn } from "./auth.js";
import { setAdminSession } from "./admin-guard.js";
import { usingFirebase } from "./admin-data.js";
import { toast, isEmail } from "./utils.js";

async function adminEmail() {
  try { const cfg = await import("../firebase/firebase-config.js"); return (cfg.ADMIN_EMAIL || "").toLowerCase(); }
  catch { return ""; }
}

const note = document.getElementById("note");
usingFirebase().then((live) => {
  note.innerHTML = live
    ? "Signs in with your Firebase admin account."
    : "Demo mode: enter the admin email from firebase-config.js (default <b>your-email@example.com</b>) and any password to preview the dashboard.";
});

document.getElementById("loginBtn").onclick = async () => {
  const btn = document.getElementById("loginBtn");
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  if (!isEmail(email)) { toast("Enter a valid email", "err"); return; }
  const want = await adminEmail();
  btn.disabled = true; btn.textContent = "Signing in…";

  if (!(await usingFirebase())) {
    // demo mode: accept the configured admin email (or the default placeholder)
    if (want && email.toLowerCase() !== want && want !== "your-email@example.com") {
      toast("That email isn't the admin address", "err"); btn.disabled = false; btn.textContent = "Sign in to dashboard"; return;
    }
    setAdminSession(email);
    location.href = "dashboard.html";
    return;
  }
  try {
    const u = await logIn({ email, password });
    if (want && u.email.toLowerCase() !== want) { toast("Not an admin account", "err"); btn.disabled = false; btn.textContent = "Sign in to dashboard"; return; }
    location.href = "dashboard.html";
  } catch (e) { toast(e.message || "Sign in failed", "err"); btn.disabled = false; btn.textContent = "Sign in to dashboard"; }
};

document.getElementById("password").addEventListener("keydown", (e) => { if (e.key === "Enter") document.getElementById("loginBtn").click(); });
