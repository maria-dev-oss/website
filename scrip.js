const btn = document.getElementById("toggle-theme");
const btnIcon = btn.querySelector(".btn__icon");
const btnText = btn.querySelector(".btn__text");

const canvas = document.getElementById("sky");
const ctx = canvas.getContext("2d");

let W = 0, H = 0, DPR = 1;
let stars = [];
let meteors = [];
let rafId = null;

// ===== Theme (starts NIGHT by default) =====
function applyTheme(isDark) {
  document.body.classList.toggle("dark", isDark);

  // Button label means "what will happen if you click"
  if (isDark) {
    btnIcon.textContent = "🌙";
    btnText.textContent = "Light Mode";
    startSky();
  } else {
    btnIcon.textContent = "☀️";
    btnText.textContent = "Dark Mode";
    // keep animation running but softer; you can stop completely if you want:
    startSky();
  }
}

btn.addEventListener("click", () => {
  const isDarkNow = document.body.classList.contains("dark");
  applyTheme(!isDarkNow);
});

// ===== Canvas Resize =====
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = Math.floor(window.innerWidth);
  H = Math.floor(window.innerHeight);

  canvas.width = Math.floor(W * DPR);
  canvas.height = Math.floor(H * DPR);
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  // Rebuild stars for crispness
  buildStars();
}

window.addEventListener("resize", resize);

// ===== Stars =====
function rand(min, max) { return Math.random() * (max - min) + min; }

function buildStars() {
  stars = [];
  const density = Math.round((W * H) / 9000); // adjust density
  const count = Math.max(220, Math.min(900, density));

  for (let i = 0; i < count; i++) {
    stars.push({
      x: rand(0, W),
      y: rand(0, H),
      r: rand(0.6, 1.8),
      a: rand(0.2, 1),
      tw: rand(0.002, 0.012), // twinkle speed
      drift: rand(-0.03, 0.03)
    });
  }
}

// ===== Meteors (shooting stars) =====
function spawnMeteor() {
  // spawn from top-left-ish going down-right
  const startX = rand(-W * 0.2, W * 0.8);
  const startY = rand(-H * 0.2, H * 0.2);
  const len = rand(120, 340);
  const speed = rand(10, 18);
  const angle = rand(Math.PI * 0.20, Math.PI * 0.30); // ~36° to ~54°
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
  const isDark = document.body.classList.contains("dark");
  const chance = isDark ? 0.05 : 0.012; // more meteors at night
  if (Math.random() < chance && meteors.length < 6) spawnMeteor();
}

// ===== Background painting =====
function paintBackground() {
  const isDark = document.body.classList.contains("dark");

  // clear
  ctx.clearRect(0, 0, W, H);

  // gradient base
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

  // subtle vignette
  const v = ctx.createRadialGradient(W * 0.5, H * 0.3, 10, W * 0.5, H * 0.5, Math.max(W, H));
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, isDark ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.12)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

function paintStars() {
  const isDark = document.body.classList.contains("dark");
  const alphaBoost = isDark ? 1 : 0.35;

  // twinkle + slight drift
  for (const s of stars) {
    s.a += (Math.random() - 0.5) * s.tw;
    s.a = Math.max(0.08, Math.min(1, s.a));

    s.x += s.drift;
    if (s.x < -5) s.x = W + 5;
    if (s.x > W + 5) s.x = -5;

    ctx.beginPath();
    ctx.fillStyle = `rgba(255,255,255,${s.a * alphaBoost})`;
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // a few colored sparkles in night
  if (isDark) {
    for (let i = 0; i < 12; i++) {
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
    m.x += m.vx;
    m.y += m.vy;
    m.life += 1;

    // head
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

    // remove
    if (m.life > m.maxLife || m.x > W + 400 || m.y > H + 400) {
      meteors.splice(i, 1);
    }
  }
}

// ===== Main loop =====
function loop() {
  paintBackground();
  paintStars();
  maybeSpawnMeteor();
  paintMeteors();
  rafId = requestAnimationFrame(loop);
}

function startSky() {
  if (!rafId) loop();
}

// ===== Init =====
resize();

// يبدأ ليلي دائمًا كما طلبت
applyTheme(true);
