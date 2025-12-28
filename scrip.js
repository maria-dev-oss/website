const btn = document.getElementById("toggle-theme");
const btnIcon = btn.querySelector(".btn__icon");
const btnText = btn.querySelector(".btn__text");

const canvas = document.getElementById("sky");
const ctx = canvas.getContext("2d", { alpha: true });

let W = 0, H = 0, DPR = 1;
let stars = [];
let meteors = [];
let rafId = null;
let running = false;

const STORAGE_KEY = "cv_theme";
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function rand(min, max) { return Math.random() * (max - min) + min; }

// ===== الثيم  =====
function setTheme(isDark, save = true) {
  document.body.classList.toggle("dark", isDark);
  btn.setAttribute("aria-pressed", String(isDark));

  // هنا المود
  if (isDark) {
    btnIcon.textContent = "🌙";
    btnText.textContent = "Light Mode";
  } else {
    btnIcon.textContent = "☀️";
    btnText.textContent = "Dark Mode";
  }

  if (save) {
    localStorage.setItem(STORAGE_KEY, isDark ? "dark" : "light");
  }

  startSky();
}

btn.addEventListener("click", () => {
  const isDarkNow = document.body.classList.contains("dark");
  setTheme(!isDarkNow, true);
});

// ===== كنافة =====
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = Math.floor(window.innerWidth);
  H = Math.floor(window.innerHeight);

  canvas.width = Math.floor(W * DPR);
  canvas.height = Math.floor(H * DPR);
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  buildStars();
}

window.addEventListener("resize", resize);

// ===== نجوم ضفتهم هينا =====
function buildStars() {
  stars = [];
  const density = Math.round((W * H) / 9000);
  const count = Math.max(200, Math.min(850, density));

  for (let i = 0; i < count; i++) {
    stars.push({
      x: rand(0, W),
      y: rand(0, H),
      r: rand(0.6, 1.8),
      a: rand(0.2, 1),
      tw: rand(0.002, 0.012),
      drift: rand(-0.03, 0.03)
    });
  }
}

function spawnMeteor() {
  const startX = rand(-W * 0.2, W * 0.8);
  const startY = rand(-H * 0.2, H * 0.2);
  const len = rand(120, 340);
  const speed = rand(10, 18);
  const angle = rand(Math.PI * 0.20, Math.PI * 0.30);

  meteors.push({
    x: startX,
    y: startY,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    len,
    life: 0,
    maxLife: rand(18, 30),
    w: rand(1.2, 2.2)
  });
}

function maybeSpawnMeteor() {
  if (prefersReducedMotion) return;

  const isDark = document.body.classList.contains("dark");
  const chance = isDark ? 0.05 : 0.012; 
  if (Math.random() < chance && meteors.length < 6) spawnMeteor();
}

function paintBackground() {
  const isDark = document.body.classList.contains("dark");

  ctx.clearRect(0, 0, W, H);

  const g = ctx.createLinearGradient(0, 0, 0, H);
  if (isDark) {
    g.addColorStop(0, "#02040f");
    g.addColorStop(0.45, "#070d2b");
    g.addColorStop(1, "#0a1140");
  } else {
    g.addColorStop(0, "#4db5ff");
    g.addColorStop(0.55, "#9ddcff");
    g.addColorStop(1, "#e7f7ff");
  }

  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const v = ctx.createRadialGradient(W * 0.5, H * 0.3, 10, W * 0.5, H * 0.5, Math.max(W, H));
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, isDark ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.12)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

function paintStars() {
  const isDark = document.body.classList.contains("dark");
  const alphaBoost = isDark ? 1 : 0.35;

  for (const s of stars) {
    if (!prefersReducedMotion) {
      s.a += (Math.random() - 0.5) * s.tw;
      s.a = Math.max(0.08, Math.min(1, s.a));
      s.x += s.drift;
      if (s.x < -5) s.x = W + 5;
      if (s.x > W + 5) s.x = -5;
    }

    ctx.beginPath();
    ctx.fillStyle = `rgba(255,255,255,${s.a * alphaBoost})`;
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }

  if (isDark && !prefersReducedMotion) {
    for (let i = 0; i < 10; i++) {
      const x = rand(0, W), y = rand(0, H);
      const r = rand(0.7, 1.6);
      ctx.beginPath();
      ctx.fillStyle = `rgba(${Math.floor(rand(180,255))},${Math.floor(rand(120,255))},${Math.floor(rand(200,255))},0.08)`;
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function paintMeteors() {
  const isDark = document.body.classList.contains("dark");
  const baseA = isDark ? 1 : 0.35;

  for (let i = meteors.length - 1; i >= 0; i--) {
    const m = meteors[i];

    if (!prefersReducedMotion) {
      m.x += m.vx;
      m.y += m.vy;
      m.life += 1;
    } else {
      m.life += 2;
    }

    const a = (1 - (m.life / m.maxLife)) * baseA;
    const tailX = m.x - m.vx * (m.len / 18);
    const tailY = m.y - m.vy * (m.len / 18);

    const grad = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
    grad.addColorStop(0, `rgba(255,255,255,${0.95 * a})`);
    grad.addColorStop(0.35, `rgba(46,233,255,${0.38 * a})`);
    grad.addColorStop(1, `rgba(255,255,255,0)`);

    ctx.strokeStyle = grad;
    ctx.lineWidth = m.w;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(m.x, m.y);
    ctx.lineTo(tailX, tailY);
    ctx.stroke();

    if (m.life > m.maxLife || m.x > W + 400 || m.y > H + 400) {
      meteors.splice(i, 1);
    }
  }
}

function loop() {
  if (!running) return;

  paintBackground();
  paintStars();
  maybeSpawnMeteor();
  paintMeteors();

  rafId = requestAnimationFrame(loop);
}

function startSky() {
  if (running) return;
  running = true;
  rafId = requestAnimationFrame(loop);
}

function stopSky() {
  running = false;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopSky();
  else startSky();
});

resize();

// يبدأ ليلي دائمًا إلا إذا كان المستخدم اختار سابقاً
const saved = localStorage.getItem(STORAGE_KEY);
if (saved === "light") {
  setTheme(false, false);
} else {
  setTheme(true, false);
}

startSky();
