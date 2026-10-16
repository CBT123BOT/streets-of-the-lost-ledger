// =====================================================================
//  CONTROLS: keyboard for 2 players + on-screen touch buttons for phones
//  Every player gets the same simple "pad": left/right/up/down + punch/kick/jump
// =====================================================================
const KEYMAP = {
  1: { left: 'LEFT', right: 'RIGHT', up: 'UP', down: 'DOWN', punch: 'Z', kick: 'X', jump: 'C' },
  2: { left: 'A',    right: 'D',     up: 'W',  down: 'S',    punch: 'F', kick: 'G', jump: 'H' }
};
// Touch buttons write into here (only Player 1 uses touch)
// TOUCH_TAPS remembers quick taps so even a super-fast tap between frames still counts
const TOUCH_TAPS = {};
const TOUCH = { left: false, right: false, up: false, down: false, punch: false, kick: false, jump: false, start: false, pause: false };

// Make a pad for player n inside a scene. pad.read() gives held buttons + "just pressed" ones.
function makePad(scene, n) {
  const keys = {}, map = KEYMAP[n];
  for (const b in map) keys[b] = scene.input.keyboard.addKey(map[b], true, false);
  const prev = {};
  return {
    read() {
      const out = { held: {}, pressed: {} };
      for (const b in map) {
        const down = keys[b].isDown || (n === 1 && TOUCH[b]);
        const tapped = n === 1 && TOUCH_TAPS[b]; if (tapped) TOUCH_TAPS[b] = false;
        out.held[b] = down || tapped; out.pressed[b] = (down && !prev[b]) || (tapped && !prev[b]); prev[b] = down;
      }
      return out;
    }
  };
}

// ---------------------------------------------------------------------
//  TOUCH CONTROLS (phones/tablets)
//  - Left thumb: one big d-pad zone. Where your thumb sits = which way you walk
//    (diagonals work, and you can slide your thumb around without lifting).
//  - Right thumb: P (punch), K (kick), J (jump). Several fingers at once work,
//    so you can walk AND punch together (multi-touch).
// ---------------------------------------------------------------------
const IS_TOUCH = ('ontouchstart' in window) || navigator.maxTouchPoints > 0 ||
  new URLSearchParams(location.search).get('touch') === '1';

function setupTouch() {
  // Any tap or click anywhere turns sound on (browsers require a tap first)
  const unlock = () => { Sound.init(); if (Sound.ctx && Sound.ctx.state === 'suspended') Sound.ctx.resume(); };
  ['pointerdown', 'touchstart', 'keydown'].forEach(ev => window.addEventListener(ev, unlock, { passive: true }));
  // Desktop: clicking the game gives it keyboard focus
  const gameDiv = document.getElementById('game');
  if (gameDiv) { gameDiv.tabIndex = 0; gameDiv.addEventListener('pointerdown', () => gameDiv.focus()); }
  // Fullscreen button (works on Android/desktop; iPhone Safari doesn't allow it, use "Add to Home Screen")
  const fs = document.getElementById('fsBtn');
  if (fs) fs.addEventListener('click', () => {
    const el = document.documentElement;
    if (document.fullscreenElement) document.exitFullscreen();
    else if (el.requestFullscreen) el.requestFullscreen().then(() => { try { screen.orientation.lock('landscape'); } catch (e) {} }).catch(() => {});
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  });
  if (!IS_TOUCH) return;
  document.body.classList.add('touch');

  // D-pad: track the finger on it and turn its position into directions
  const pad = document.getElementById('dpad'), knob = document.getElementById('knob');
  let padId = null;
  const setDir = (e) => {
    const r = pad.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const dead = r.width * 0.12;                         // small dead zone in the middle
    TOUCH.left = dx < -dead; TOUCH.right = dx > dead; TOUCH.up = dy < -dead; TOUCH.down = dy > dead;
    const len = Math.min(1, Math.hypot(dx, dy) / (r.width / 2)), ang = Math.atan2(dy, dx);
    knob.style.transform = `translate(${Math.cos(ang) * len * r.width * 0.3}px, ${Math.sin(ang) * len * r.width * 0.3}px)`;
  };
  const clearDir = () => { TOUCH.left = TOUCH.right = TOUCH.up = TOUCH.down = false; knob.style.transform = ''; padId = null; };
  pad.addEventListener('pointerdown', e => { e.preventDefault(); padId = e.pointerId; pad.setPointerCapture(e.pointerId); setDir(e); });
  pad.addEventListener('pointermove', e => { if (e.pointerId === padId) setDir(e); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => pad.addEventListener(ev, e => { if (e.pointerId === padId) clearDir(); }));

  // Buttons: each one is held while any finger is on it
  document.querySelectorAll('[data-b]').forEach(el => {
    const b = el.dataset.b, fingers = new Set();
    const update = () => { TOUCH[b] = fingers.size > 0; el.classList.toggle('on', fingers.size > 0); };
    el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); fingers.add(e.pointerId); TOUCH_TAPS[b] = true; el.setPointerCapture(e.pointerId); update(); if (navigator.vibrate) navigator.vibrate(10); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => el.addEventListener(ev, e => { fingers.delete(e.pointerId); update(); }));
  });
  // Stop the page from scrolling / zooming / long-press menus while playing
  document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('gesturestart', e => e.preventDefault());
}
