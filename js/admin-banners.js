import { requireAdmin, renderAdminShell } from "./admin-guard.js";
import { listBanners, saveBanner, deleteBanner, uploadImage } from "./admin-data.js";
import { esc, toast } from "./utils.js";

let banners = [], workImg = "";
(async function () {
  const user = await requireAdmin(); if (!user) return;
  const body = renderAdminShell("banners", user);
  body.innerHTML = `
    <div class="ad-h"><div><h1>Banners</h1><p>Homepage hero slides — changes show on the storefront</p></div>
      <button class="btn btn-primary" id="newBtn">+ New banner</button></div>
    <div class="ad-panel" style="padding:0;overflow-x:auto">
      <table class="ad-table"><thead><tr><th>Preview</th><th>Title</th><th>Link</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody id="rows"></tbody></table>
    </div>`;
  document.getElementById("newBtn").onclick = () => openEditor(null);
  await reload();
})();
async function reload() { banners = await listBanners(); render(); }
function render() {
  document.getElementById("rows").innerHTML = banners.map((b) => `
    <tr>
      <td><img src="${esc(b.image)}" alt="" style="width:96px;height:48px;object-fit:cover;border-radius:8px"></td>
      <td><b>${esc(b.title)}</b><br><span class="muted" style="font-size:.78rem">${esc(b.subtitle || "")}</span></td>
      <td>${esc(b.link || "—")}</td>
      <td><span class="pill ${b.active === false ? "off" : "on"}">${b.active === false ? "Hidden" : "Live"}</span></td>
      <td><div class="t-actions">
        <button class="mini-btn" data-act="edit" data-id="${esc(b.id)}">Edit</button>
        <button class="mini-btn danger" data-act="del" data-id="${esc(b.id)}">Delete</button>
      </div></td>
    </tr>`).join("") || `<tr class="empty-row"><td colspan="5">No banners.</td></tr>`;
  document.getElementById("rows").querySelectorAll("[data-act]").forEach((btn) =>
    btn.onclick = () => { const b = banners.find((x) => x.id === btn.dataset.id); btn.dataset.act === "edit" ? openEditor(b) : del(b); });
}
async function del(b) { if (!confirm(`Delete banner "${b.title}"?`)) return; await deleteBanner(b.id); toast("Deleted"); reload(); }

function openEditor(b) {
  workImg = b?.image || "";
  const box = document.getElementById("modalBox");
  box.innerHTML = `
    <span class="close-x" id="closeX">×</span>
    <h2>${b ? "Edit banner" : "New banner"}</h2>
    <div class="field"><label>Title</label><input id="b-title" value="${esc(b?.title || "")}"></div>
    <div class="field"><label>Subtitle</label><input id="b-sub" value="${esc(b?.subtitle || "")}"></div>
    <div class="field"><label>Link (page or URL)</label><input id="b-link" value="${esc(b?.link || "women.html")}"></div>
    <div class="field"><label>Image</label>
      <div class="img-drop" id="imgDrop">Click to upload a banner image</div>
      <input type="file" id="imgFile" accept="image/*" hidden>
      <div style="display:flex;gap:8px;margin-top:8px"><input id="b-imgurl" placeholder="or paste image URL" value="${esc(workImg)}" style="flex:1;padding:9px 12px;border:1.5px solid var(--line-strong);border-radius:8px;background:var(--surface);color:var(--ink)"></div>
      <div class="img-previews" id="prev"></div>
    </div>
    <div class="field"><label><input type="checkbox" id="b-active" ${b?.active === false ? "" : "checked"}> Show on homepage</label></div>
    <div style="display:flex;gap:12px;margin-top:18px">
      <button class="btn btn-line" id="cancelBtn">Cancel</button>
      <button class="btn btn-primary" id="saveBtn" style="flex:1">${b ? "Save" : "Create"}</button>
    </div>`;
  document.getElementById("modalBg").classList.add("open");
  const prev = () => document.getElementById("prev").innerHTML = workImg ? `<div class="img-prev"><img src="${esc(workImg)}"></div>` : "";
  prev();
  document.getElementById("imgDrop").onclick = () => document.getElementById("imgFile").click();
  document.getElementById("imgFile").onchange = async (e) => {
    if (!e.target.files[0]) return; toast("Uploading…");
    try { workImg = await uploadImage(e.target.files[0]); document.getElementById("b-imgurl").value = workImg; prev(); toast("Uploaded ✦", "ok"); }
    catch (err) { toast(err.message, "err"); }
  };
  document.getElementById("b-imgurl").oninput = (e) => { workImg = e.target.value.trim(); prev(); };
  document.getElementById("closeX").onclick = close;
  document.getElementById("cancelBtn").onclick = close;
  document.getElementById("saveBtn").onclick = async () => {
    const title = document.getElementById("b-title").value.trim();
    if (!title) { toast("Title required", "err"); return; }
    await saveBanner({
      id: b?.id, title, subtitle: document.getElementById("b-sub").value.trim(),
      link: document.getElementById("b-link").value.trim(),
      image: workImg || "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1600&q=80",
      active: document.getElementById("b-active").checked
    });
    toast("Saved ✦", "ok"); close(); reload();
  };
}
function close() { document.getElementById("modalBg").classList.remove("open"); }
document.getElementById("modalBg").addEventListener("click", (e) => { if (e.target.id === "modalBg") close(); });
