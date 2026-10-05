# 🧱 Neon Breakout

**Day 10 · featured build of my daily coding journey** — a polished, arcade-style brick-breaker with neon visuals, power-ups, and 3 hand-designed levels.

## What it looks like
A glowing paddle at the bottom, a neon ball, and walls of colorful bricks. Smash them all to clear the level — orange and red bricks are armored and need **2 hits** (watch for the crack!). Destroyed bricks burst into particles, and some drop falling power-up capsules: catch them with your paddle.

## Features
- 🧱 **3 hand-designed levels** — Warm-up, The Diamond, Fortress (levels live in `levels.js`, easy to add your own)
- ⚡ **4 power-ups** — Multi-ball, Wide paddle, Slow ball, Extra life
- 🛡️ **Armored bricks** that crack before breaking
- ✨ Particle explosions, screen glow, and retro WebAudio sound effects (zero audio files)
- 🎯 **Aim with the paddle edges** — the bounce angle follows where the ball lands
- 🏆 High score saved in `localStorage`, bonus life per cleared level
- ⏸️ Pause with `P`, mouse **or** arrow-key controls

## Run it in 30 seconds
No build step, no dependencies:
1. Download or clone this repo
2. Double-click `index.html` — it opens in your browser
3. Click **Start**, then click / press Space to launch the ball

## What I practiced
- HTML5 Canvas rendering and `requestAnimationFrame` game loops
- Delta-time movement (smooth on any refresh rate)
- AABB collision detection and bounce physics
- Game state machines (menu → serve → playing → paused → …)
- The WebAudio API for procedural sound effects
- `localStorage` for persistent high scores

## Project structure
```
index.html   — page, HUD, overlay screens
styles.css   — neon arcade styling
levels.js    — level layouts + power-up drop rates
game.js      — game loop, physics, power-ups, particles, sound
```

---
*Day 10 of shipping a coding project every day. Follow [@OBG-ent](https://github.com/OBG-ent) for the streak.* 🚀
