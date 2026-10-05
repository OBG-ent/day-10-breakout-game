/* =========================================================================
 * NEON BREAKOUT — game logic
 * Beginner-friendly tour of the pieces:
 *   1. Setup: canvas, constants, tiny sound engine
 *   2. State: one `state` string drives everything ("menu", "serve", ...)
 *   3. Entities: paddle, balls, bricks, power-ups, particles
 *   4. Loop: update(dt) moves things, draw() paints them — 60x a second
 * ========================================================================= */

// ---------- 1. Setup ----------
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width;    // 640
const H = canvas.height;   // 480

const BRICK_GAP = 6;
const BRICK_TOP = 70;
const BRICK_H = 24;
const COLS = 12;
const BRICK_W = (W - (COLS + 1) * BRICK_GAP) / COLS;

const BRICK_STYLE = {
  B: { color: "#38bdf8", points: 10, hits: 1 },
  G: { color: "#4ade80", points: 10, hits: 1 },
  Y: { color: "#facc15", points: 20, hits: 1 },
  P: { color: "#f472b6", points: 20, hits: 1 },
  O: { color: "#fb923c", points: 40, hits: 2 },  // tough: needs 2 hits
  R: { color: "#ef4444", points: 60, hits: 2 },  // tough: needs 2 hits
};

const POWERUP_STYLE = {
  M: { label: "MULTI", color: "#4ade80" },   // multi-ball
  W: { label: "WIDE",  color: "#38bdf8" },   // wide paddle (12s)
  S: { label: "SLOW",  color: "#facc15" },   // slow ball (10s)
  L: { label: "+LIFE", color: "#f472b6" },   // extra life
};

// ---------- Tiny sound engine (WebAudio, no audio files needed) ----------
let audioCtx = null;
function beep(freq, dur = 0.08, type = "square", when = 0) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const t = audioCtx.currentTime + when;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + dur);
  } catch (e) { /* sound is a nice-to-have; never crash the game over it */ }
}
const sfx = {
  paddle:  () => beep(220),
  wall:    () => beep(180, 0.05),
  brick:   () => beep(440, 0.07),
  crack:   () => beep(300, 0.07),
  power:   () => { beep(660, 0.08); beep(880, 0.1, "square", 0.08); },
  lose:    () => beep(110, 0.25, "sawtooth"),
  clear:   () => { beep(523, 0.1); beep(659, 0.1, "square", 0.1); beep(784, 0.16, "square", 0.2); },
};

// ---------- 2. State ----------
let state;            // "menu" | "serve" | "playing" | "paused" | "levelclear" | "gameover" | "win"
let score, lives, level, best;
let paddle, balls, bricks, powerups, particles;
let wideUntil = 0;    // timestamp when the wide-paddle effect expires
let slowUntil = 0;    // timestamp when the slow-ball effect expires
let keys = {};

best = Number(localStorage.getItem("neon-breakout-best") || 0);
document.getElementById("best").textContent = best;

function resetGame() {
  score = 0; lives = 3; level = 1;
  wideUntil = 0; slowUntil = 0;
  powerups = []; particles = [];
  loadLevel(1);
  updateHUD();
}

function loadLevel(n) {
  level = n;
  const def = LEVELS[n - 1];
  bricks = [];
  def.rows.forEach((row, r) => {
    [...row].forEach((ch, c) => {
      if (ch === ".") return;
      const style = BRICK_STYLE[ch];
      bricks.push({
        x: BRICK_GAP + c * (BRICK_W + BRICK_GAP),
        y: BRICK_TOP + r * (BRICK_H + BRICK_GAP),
        w: BRICK_W, h: BRICK_H,
        type: ch, color: style.color,
        points: style.points,
        hits: style.hits, maxHits: style.hits,
        alive: true,
      });
    });
  });
  // Fresh paddle + one ball ready to serve
  paddle = { w: 90, h: 14, x: W / 2 - 45, y: H - 40, speed: 540 };
  balls = [newBall()];
  powerups = [];
  state = "serve";
  updateHUD();
}

function newBall() {
  // Ball speed grows slightly each level so later levels feel faster.
  const speed = 380 * (1 + (level - 1) * 0.08);
  return { x: paddle.x + paddle.w / 2, y: paddle.y - 9, r: 7, vx: 0, vy: 0, speed, stuck: true };
}

function ballSpeed(ball) {
  // The SLOW power-up multiplies speed while active.
  return ball.speed * (Date.now() < slowUntil ? 0.7 : 1);
}

// ---------- Overlay screens ----------
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const overlayBtn = document.getElementById("overlayBtn");

function showOverlay(title, text, btnLabel) {
  overlayTitle.textContent = title;
  overlayText.innerHTML = text;
  overlayBtn.textContent = btnLabel;
  overlay.classList.remove("hidden");
}
function hideOverlay() { overlay.classList.add("hidden"); }

overlayBtn.addEventListener("click", () => {
  if (state === "menu" || state === "gameover" || state === "win") { resetGame(); hideOverlay(); }
  else if (state === "levelclear") { loadLevel(level + 1); hideOverlay(); }
  else if (state === "paused") { state = "playing"; hideOverlay(); }
});

// ---------- Input: mouse + keyboard ----------
function canvasX(clientX) {
  const rect = canvas.getBoundingClientRect();
  return (clientX - rect.left) * (W / rect.width);   // scale CSS px → canvas px
}
canvas.addEventListener("mousemove", e => {
  if (state !== "playing" && state !== "serve") return;
  paddle.x = Math.min(Math.max(canvasX(e.clientX) - paddle.w / 2, 0), W - paddle.w);
});
canvas.addEventListener("click", launch);
document.addEventListener("keydown", e => {
  keys[e.key] = true;
  if (e.key === " " || e.key === "Enter") { e.preventDefault(); launch(); }
  if ((e.key === "p" || e.key === "P") && (state === "playing" || state === "paused")) togglePause();
});
document.addEventListener("keyup", e => { keys[e.key] = false; });

function launch() {
  // Release every stuck ball with a slightly random upward angle.
  let launched = false;
  balls.forEach(b => {
    if (!b.stuck) return;
    const angle = (Math.random() * 0.6 - 0.3);        // ±~17° from straight up
    const s = ballSpeed(b);
    b.vx = Math.sin(angle) * s;
    b.vy = -Math.cos(angle) * s;
    b.stuck = false;
    launched = true;
  });
  if (launched) { state = "playing"; hideOverlay(); beep(330, 0.06); }
}

function togglePause() {
  if (state === "playing") { state = "paused"; showOverlay("PAUSED", "Take a breath. The bricks aren't going anywhere.", "▶ Resume"); }
  else if (state === "paused") { state = "playing"; hideOverlay(); }
}

// ---------- Power-ups ----------
function maybeDropPowerup(brick) {
  const chance = POWERUP_CHANCE[brick.type] || 0;
  if (Math.random() >= chance) return;
  const kinds = Object.keys(POWERUP_STYLE);
  const kind = kinds[Math.floor(Math.random() * kinds.length)];
  powerups.push({ x: brick.x + brick.w / 2, y: brick.y + brick.h / 2, vy: 150, kind, w: 52, h: 20 });
}

function applyPowerup(kind) {
  sfx.power();
  const now = Date.now();
  if (kind === "M") {
    // Multi-ball: clone every flying ball with a mirrored angle (cap at 8).
    const clones = [];
    balls.forEach(b => {
      if (b.stuck || balls.length + clones.length >= 8) return;
      clones.push({ ...b, vx: -b.vx * 0.9, vy: b.vy });
    });
    balls.push(...clones);
  }
  else if (kind === "W") { wideUntil = now + 12000; }
  else if (kind === "S") { slowUntil = now + 10000; }
  else if (kind === "L") { lives = Math.min(lives + 1, 5); updateHUD(); }
}

// ---------- Particles (little explosion when a brick dies) ----------
function burst(x, y, color) {
  for (let i = 0; i < 12; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 60 + Math.random() * 160;
    particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.5, color });
  }
}

// ---------- HUD ----------
function updateHUD() {
  document.getElementById("score").textContent = score;
  document.getElementById("lives").textContent = lives;
  document.getElementById("level").textContent = level;
  if (score > best) {
    best = score;
    localStorage.setItem("neon-breakout-best", best);
    document.getElementById("best").textContent = best;
  }
}

// ---------- 4. Update ----------
function update(dt) {
  const now = Date.now();
  const wide = now < wideUntil;
  paddle.w = wide ? 140 : 90;
  paddle.x = Math.min(paddle.x, W - paddle.w);   // keep on screen when shrinking back

  // Keyboard paddle movement (mouse handled in the mousemove listener)
  if (keys["ArrowLeft"])  paddle.x = Math.max(paddle.x - paddle.speed * dt, 0);
  if (keys["ArrowRight"]) paddle.x = Math.min(paddle.x + paddle.speed * dt, W - paddle.w);

  // Stuck balls ride on the paddle until launch
  balls.forEach(b => {
    if (b.stuck) { b.x = paddle.x + paddle.w / 2; b.y = paddle.y - b.r - 1; }
  });
  if (state !== "playing") return;

  // Move balls
  balls.forEach(b => {
    if (b.stuck) return;
    const s = ballSpeed(b);
    // Keep the velocity vector at the right length (power-up changes speed live)
    const cur = Math.hypot(b.vx, b.vy) || 1;
    b.vx = b.vx / cur * s; b.vy = b.vy / cur * s;
    b.x += b.vx * dt; b.y += b.vy * dt;

    // Walls
    if (b.x - b.r < 0)            { b.x = b.r; b.vx = Math.abs(b.vx); sfx.wall(); }
    if (b.x + b.r > W)            { b.x = W - b.r; b.vx = -Math.abs(b.vx); sfx.wall(); }
    if (b.y - b.r < 0)            { b.y = b.r; b.vy = Math.abs(b.vy); sfx.wall(); }

    // Paddle — bounce angle depends on where the ball lands (aim with the edges!)
    if (b.vy > 0 &&
        b.y + b.r >= paddle.y && b.y + b.r <= paddle.y + paddle.h + 8 &&
        b.x >= paddle.x - b.r && b.x <= paddle.x + paddle.w + b.r) {
      const rel = Math.max(-1, Math.min(1, (b.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2)));
      const ang = rel * (Math.PI / 3);            // up to 60° from vertical
      const sp = ballSpeed(b);
      b.vx = Math.sin(ang) * sp;
      b.vy = -Math.cos(ang) * sp;
      b.y = paddle.y - b.r - 1;
      sfx.paddle();
    }

    // Bricks — check overlap, then bounce off the shallowest side
    for (const br of bricks) {
      if (!br.alive) continue;
      const overlapX = Math.min(b.x + b.r, br.x + br.w) - Math.max(b.x - b.r, br.x);
      const overlapY = Math.min(b.y + b.r, br.y + br.h) - Math.max(b.y - b.r, br.y);
      if (overlapX > 0 && overlapY > 0) {
        if (overlapX < overlapY) { b.vx = -b.vx; b.x += b.vx > 0 ? overlapX : -overlapX; }
        else                     { b.vy = -b.vy; b.y += b.vy > 0 ? overlapY : -overlapY; }
        hitBrick(br);
        break;   // one brick per frame keeps the physics stable
      }
    }

    // Anti-stall: never let the ball go (nearly) horizontal — it gets boring
    if (Math.abs(b.vy) < s * 0.2) {
      b.vy = (b.vy >= 0 ? 1 : -1) * s * 0.2;
      const cur2 = Math.hypot(b.vx, b.vy);
      b.vx = b.vx / cur2 * s; b.vy = b.vy / cur2 * s;
    }
  });

  // Remove balls that fell past the bottom
  balls = balls.filter(b => b.y - b.r <= H + 20);
  if (balls.length === 0) {
    lives--;
    sfx.lose();
    updateHUD();
    if (lives < 0) return gameOver();
    balls = [newBall()];
    state = "serve";
    showOverlay("BALL LOST", `${lives} ${lives === 1 ? "life" : "lives"} left — click to serve again.`, "▶ Serve");
    return;
  }

  // Level cleared?
  if (bricks.every(br => !br.alive)) {
    sfx.clear();
    lives = Math.min(lives + 1, 5);   // bonus life for clearing a level
    updateHUD();
    if (level >= LEVELS.length) return victory();
    state = "levelclear";
    const def = LEVELS[level];        // next level's name (level is 0-based here +1)
    showOverlay(`LEVEL ${level} CLEAR!`, `+1 life bonus 🎉<br />Next up: <strong>${def.name}</strong> — tougher bricks, faster ball.`, "▶ Next level");
    return;
  }

  // Falling power-up capsules
  powerups.forEach(p => {
    p.y += p.vy * dt;
    if (p.y + p.h / 2 >= paddle.y && p.y - p.h / 2 <= paddle.y + paddle.h &&
        p.x >= paddle.x && p.x <= paddle.x + paddle.w) {
      p.caught = true;
      applyPowerup(p.kind);
    }
  });
  powerups = powerups.filter(p => !p.caught && p.y < H + 30);

  // Particles fade out
  particles.forEach(pt => {
    pt.x += pt.vx * dt; pt.y += pt.vy * dt;
    pt.vy += 300 * dt;                 // slight gravity
    pt.life -= dt;
  });
  particles = particles.filter(pt => pt.life > 0);
}

function hitBrick(br) {
  br.hits--;
  if (br.hits <= 0) {
    br.alive = false;
    score += br.points;
    burst(br.x + br.w / 2, br.y + br.h / 2, br.color);
    sfx.brick();
    maybeDropPowerup(br);
    updateHUD();
  } else {
    sfx.crack();   // tough brick cracked — one more hit!
  }
}

function gameOver() {
  state = "gameover";
  showOverlay("GAME OVER",
    `Final score: <strong>${score}</strong><br />Best: <strong>${best}</strong><br />The bricks win this round. Run it back?`,
    "↻ Play again");
}

function victory() {
  state = "win";
  showOverlay("🏆 YOU WIN!",
    `All ${LEVELS.length} levels cleared!<br />Final score: <strong>${score}</strong> · Best: <strong>${best}</strong>`,
    "↻ Play again");
}

// ---------- Draw ----------
function draw() {
  ctx.clearRect(0, 0, W, H);

  // Bricks (cracked ones render dimmer)
  bricks.forEach(br => {
    if (!br.alive) return;
    const cracked = br.hits < br.maxHits;
    ctx.globalAlpha = cracked ? 0.55 : 1;
    ctx.fillStyle = br.color;
    roundRect(br.x, br.y, br.w, br.h, 5);
    ctx.fill();
    // glossy highlight strip
    ctx.globalAlpha = cracked ? 0.25 : 0.35;
    ctx.fillStyle = "#ffffff";
    roundRect(br.x + 4, br.y + 3, br.w - 8, 5, 3);
    ctx.fill();
    ctx.globalAlpha = 1;
    if (cracked) {   // draw a crack line so players see it needs one more hit
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(br.x + br.w * 0.3, br.y + 3);
      ctx.lineTo(br.x + br.w * 0.55, br.y + br.h / 2);
      ctx.lineTo(br.x + br.w * 0.35, br.y + br.h - 3);
      ctx.stroke();
    }
  });

  // Power-up capsules
  powerups.forEach(p => {
    const st = POWERUP_STYLE[p.kind];
    ctx.fillStyle = "#0a0f22";
    ctx.strokeStyle = st.color;
    ctx.lineWidth = 2;
    roundRect(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h, 10);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = st.color;
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(st.label, p.x, p.y + 1);
  });

  // Paddle (glows while WIDE is active)
  const wide = Date.now() < wideUntil;
  ctx.fillStyle = wide ? "#38bdf8" : "#e8ecf8";
  ctx.shadowColor = wide ? "#38bdf8" : "#22d3ee";
  ctx.shadowBlur = 14;
  roundRect(paddle.x, paddle.y, paddle.w, paddle.h, 7);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Balls with a neon glow
  balls.forEach(b => {
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "#22d3ee";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  // Particles
  particles.forEach(pt => {
    ctx.globalAlpha = Math.max(pt.life * 2, 0);
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x - 2, pt.y - 2, 4, 4);
  });
  ctx.globalAlpha = 1;

  // Active effect timers (tiny badges under the HUD area)
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "left"; ctx.textBaseline = "top";
  let badgeY = 46;
  if (Date.now() < wideUntil) {
    ctx.fillStyle = "#38bdf8";
    ctx.fillText(`WIDE ${Math.ceil((wideUntil - Date.now()) / 1000)}s`, 12, badgeY);
    badgeY += 18;
  }
  if (Date.now() < slowUntil) {
    ctx.fillStyle = "#facc15";
    ctx.fillText(`SLOW ${Math.ceil((slowUntil - Date.now()) / 1000)}s`, 12, badgeY);
  }
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---------- 5. Main loop ----------
let last = performance.now();
function frame(now) {
  let dt = (now - last) / 1000;
  last = now;
  dt = Math.min(dt, 1 / 30);   // clamp huge gaps (e.g. tab was in background)
  if (paddle && (state === "playing" || state === "serve")) update(dt);
  if (paddle) draw();
  requestAnimationFrame(frame);
}

// ---------- Go ----------
resetGame();
state = "menu";
showOverlay("NEON BREAKOUT",
  "Smash every brick. Catch the falling power-ups.<br />3 levels. How far can you get?",
  "▶ Start game");
requestAnimationFrame(frame);
