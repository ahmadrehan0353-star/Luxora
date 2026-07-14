import { renderNavbar } from "./navbar.js";
import { renderFooter } from "./app.js";
import { signUp, currentUser } from "./auth.js";
import { toast, param } from "./utils.js";

renderNavbar(""); renderFooter();
currentUser().then((u) => { if (u) location.href = "profile.html"; });

const pw = document.getElementById("password");
document.getElementById("pwToggle").onclick = () => {
  pw.type = pw.type === "password" ? "text" : "password";
  document.getElementById("pwToggle").textContent = pw.type === "password" ? "Show" : "Hide";
};

document.getElementById("submitBtn").onclick = async () => {
  const btn = document.getElementById("submitBtn");
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = pw.value;
  btn.disabled = true; btn.textContent = "Creating…";
  try {
    await signUp({ name, email, password });
    // show a "check your email" confirmation
    document.querySelector(".auth-card").innerHTML = `
      <div style="text-align:center">
        <div style="width:64px;height:64px;border-radius:50%;background:var(--gold);display:grid;place-items:center;margin:0 auto 20px">
          <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#fff" stroke-width="2"><path d="M4 6h16v12H4z"/><path d="M4 7l8 6 8-6"/></svg>
        </div>
        <h1 style="font-size:1.6rem;margin-bottom:10px">Check your inbox</h1>
        <p class="auth-sub" style="margin-bottom:24px">We've sent a verification link to <b>${email}</b>. Click it to confirm your account, then sign in.</p>
        <a class="btn btn-primary btn-block" href="login.html">Go to sign in</a>
        <p class="form-note">Didn't get it? Check spam, or sign in and we'll offer to resend.</p>
      </div>`;
  } catch (e) {
    toast(e.message || "Could not create account", "err");
    btn.disabled = false; btn.textContent = "Create account";
  }
};
