// ============================================================
// LUXORA — homepage logic
// ============================================================
import { renderNavbar } from "./navbar.js";
import { renderFooter, initReveal } from "./app.js";
import { featured, trending, bestsellers, newArrivals, loadProducts } from "./products.js";
import { renderGrid } from "./product-card.js";
import { placeholder } from "./utils.js";

const SLIDES = [
  { img: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1600&q=80", eyebrow: "The New Season", title: "Quiet luxury, redefined.", text: "Discover the Women's collection — considered pieces in premium fabrics.", cta: "Shop Women", href: "women.html" },
  { img: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1600&q=80", eyebrow: "Autumn Editorial", title: "Warmth in every layer.", text: "Cashmere, wool and tailored outerwear built to last.", cta: "Shop New In", href: "index.html#new" },
  { img: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1600&q=80", eyebrow: "For Him", title: "Effortless, elevated.", text: "Menswear staples with an impeccable finish.", cta: "Shop Men", href: "men.html" }
];

let slide = 0, timer, SLIDES_ACTIVE = SLIDES;

async function boot() {
  renderNavbar("");
  renderFooter();
  await loadProducts();
  await loadBanners();
  buildHero();
  renderGrid("gridNew", (await newArrivals()).slice(0, 8));
  renderGrid("gridTrending", (await trending()).slice(0, 4));
  renderGrid("gridBest", (await bestsellers()).slice(0, 4));
  buildInstagram();
  initReveal();
}

// Pull hero slides the admin manages in Banners; fall back to the defaults.
async function loadBanners() {
  try {
    const { listBanners } = await import("./admin-data.js");
    const banners = (await listBanners()).filter((b) => b.active !== false);
    if (banners.length) {
      SLIDES_ACTIVE = banners.map((b) => ({
        img: b.image, eyebrow: b.subtitle || "LUXORA", title: b.title,
        text: b.subtitle || "", cta: "Shop now", href: b.link || "women.html"
      }));
    }
  } catch { /* keep defaults */ }
}

function buildHero() {
  const wrap = document.getElementById("heroSlides");
  const dots = document.getElementById("heroDots");
  wrap.innerHTML = SLIDES_ACTIVE.map((s, i) => `
    <div class="hero-slide ${i===0?'on':''}">
      <img src="${s.img}" alt="">
      <div class="hero-content">
        <span class="eyebrow">${s.eyebrow}</span>
        <h1>${s.title}</h1>
        <p>${s.text}</p>
        <a class="btn btn-primary" href="${s.href}" style="background:#fff;color:#111">${s.cta}</a>
      </div>
    </div>`).join("");
  dots.innerHTML = SLIDES_ACTIVE.map((_, i) => `<button class="${i===0?'on':''}" data-i="${i}" aria-label="Slide ${i+1}"></button>`).join("");
  dots.querySelectorAll("button").forEach((b) => b.onclick = () => show(+b.dataset.i));
  document.getElementById("heroPrev").onclick = () => show(slide - 1);
  document.getElementById("heroNext").onclick = () => show(slide + 1);
  auto();
}
function show(i) {
  const slides = document.querySelectorAll(".hero-slide");
  const dots = document.querySelectorAll(".hero-dots button");
  slide = (i + slides.length) % slides.length;
  slides.forEach((s, k) => s.classList.toggle("on", k === slide));
  dots.forEach((d, k) => d.classList.toggle("on", k === slide));
  auto();
}
function auto() { clearInterval(timer); timer = setInterval(() => show(slide + 1), 5500); }

function buildInstagram() {
  const ig = document.getElementById("igGrid");
  if (!ig) return;
  ig.innerHTML = Array.from({ length: 6 }, (_, i) =>
    `<a href="#" aria-label="Instagram post"><img loading="lazy" src="${`https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=400&q=80`}" alt=""></a>`).join("");
}

boot();
