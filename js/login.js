import { renderNavbar } from "./navbar.js";
import { renderFooter } from "./app.js";
import { logIn, resetPassword, currentUser } from "./auth.js";
import { toast, param } from "./utils.js";

renderNavbar(""); renderFooter();

// already signed in? go to account
currentUser().then((u) => { if (u) location.href = "profile.html"; });

const pw = document.getElementById("password");
document.getElementById("pwToggle").onclick = () => {
  pw.type = pw.type === "password" ? "text" : "password";
  document.getElementById("pwToggle").textContent = pw.type === "password" ? "Show" : "Hide";
};

document.getElementById("submitBtn").onclick = async () => {
  const btn = document.getElementById("submitBtn");
  const email = document.getElementById("email").value.trim();
  const password = pw.value;
  btn.disabled = true; btn.textContent = "Signing in…";
  try {
    await logIn({ email, password });
    toast("Welcome back ✦", "ok");
    const next = param("next");
    setTimeout(() => location.href = next || "profile.html", 500);
  } catch (e) {
    toast(e.message || "Sign in failed", "err");
    btn.disabled = false; btn.textContent = "Sign in";
  }
};

document.getElementById("password").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("submitBtn").click();
});

document.getElementById("forgot").onclick = async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value.trim();
  if (!email) { toast("Enter your email first, then tap forgot password", "err"); return; }
  try { await resetPassword(email); toast("Password reset email sent", "ok"); }
  catch (err) { toast(err.message, "err"); }
};
