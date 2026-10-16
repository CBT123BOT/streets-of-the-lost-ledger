// =====================================================================
//  SPRITES: all fighter art is drawn here with code (original pixel art).
//  Each fighter gets one strip of 32x48 frames: idle, walk, punch, kick...
// =====================================================================
const FRAME_W = 32, FRAME_H = 48;
const FRAMES = ['idle', 'walk1', 'walk2', 'punch', 'punch2', 'kick', 'jump', 'jumpkick', 'hurt', 'down', 'grab', 'throw'];

// Where hands/feet go in each frame (fighter faces RIGHT). [x, y] inside the 32x48 box.
// fa = front arm hand, ba = back arm hand, fl = front foot, bl = back foot, lean = torso shift
const POSES = {
  idle:     { fa: [20, 28], ba: [13, 28], fl: [19, 47], bl: [13, 47], lean: 0 },
  walk1:    { fa: [13, 28], ba: [21, 27], fl: [22, 47], bl: [10, 47], lean: 0 },
  walk2:    { fa: [21, 27], ba: [12, 28], fl: [15, 47], bl: [18, 47], lean: 0 },
  punch:    { fa: [31, 20], ba: [18, 25], fl: [21, 47], bl: [11, 47], lean: 2 },
  punch2:   { fa: [28, 13], ba: [17, 25], fl: [21, 47], bl: [11, 47], lean: 1 },
  kick:     { fa: [10, 22], ba: [20, 22], fl: [31, 30], bl: [13, 47], lean: -2 },
  jump:     { fa: [23, 14], ba: [10, 16], fl: [21, 40], bl: [12, 41], lean: 0 },
  jumpkick: { fa: [12, 18], ba: [20, 20], fl: [31, 38], bl: [12, 38], lean: -1 },
  hurt:     { fa: [7, 20],  ba: [10, 25], fl: [19, 47], bl: [12, 47], lean: -3 },
  grab:     { fa: [27, 24], ba: [25, 26], fl: [20, 47], bl: [12, 47], lean: 2 },
  throw:    { fa: [8, 12],  ba: [10, 14], fl: [22, 47], bl: [12, 47], lean: -3 }
};
// Where the head sits (center) for each frame, so it follows the body.
const HEAD_POS = {
  idle: [16, 9], walk1: [16, 9], walk2: [16, 10], punch: [19, 10], punch2: [18, 9],
  kick: [14, 10], jump: [16, 9], jumpkick: [15, 11], hurt: [12, 11], down: [6, 40],
  grab: [18, 10], throw: [13, 10]
};

// Draw a thick pixel line (used for arms and legs)
function thickLine(ctx, x0, y0, x1, y1, size, color) {
  ctx.fillStyle = color;
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
  for (let i = 0; i <= steps; i++) {
    const x = Math.round(x0 + (x1 - x0) * i / steps), y = Math.round(y0 + (y1 - y0) * i / steps);
    ctx.fillRect(x - (size >> 1), y - (size >> 1), size, size);
  }
}
function hex(c) { return '#' + c.toString(16).padStart(6, '0'); }

// Draw one standing frame into the canvas at x offset ox
function drawPose(ctx, ox, p, col) {
  const sx = ox + 16 + p.lean, sy = 19, hx = ox + 16, hy = 31;   // shoulder & hip
  const limb = (from, to, size, c) => {          // limb with a bent middle joint
    const mx = (from[0] + to[0]) / 2 + 1, my = (from[1] + to[1]) / 2;
    thickLine(ctx, from[0], from[1], mx, my, size, c); thickLine(ctx, mx, my, to[0], to[1], size, c);
  };
  const o = (pt) => [ox + pt[0], pt[1]];
  // back arm + back leg (darker, behind the body)
  limb([hx - 2, hy], o(p.bl), 4, col.pantsDark); ctx.fillStyle = '#111'; ctx.fillRect(ox + p.bl[0] - 3, p.bl[1] - 2, 6, 3);
  limb([sx - 3, sy], o(p.ba), 3, col.dark);       ctx.fillStyle = col.skin; ctx.fillRect(ox + p.ba[0] - 1, p.ba[1] - 1, 3, 3);
  // torso: jacket in team color with dark outline and belt
  ctx.fillStyle = '#111'; ctx.fillRect(sx - 7, sy - 3, 14, 16);
  ctx.fillStyle = col.main; ctx.fillRect(sx - 6, sy - 2, 12, 14);
  ctx.fillStyle = col.dark; ctx.fillRect(sx - 1, sy - 2, 2, 14); ctx.fillRect(sx - 6, sy + 10, 12, 2);
  ctx.fillStyle = '#ffd700'; ctx.fillRect(sx - 1, sy + 10, 2, 2);           // belt buckle
  // front leg + front arm
  limb([hx + 2, hy], o(p.fl), 4, col.pants); ctx.fillStyle = '#111'; ctx.fillRect(ox + p.fl[0] - 3, p.fl[1] - 2, 6, 3);
  limb([sx + 3, sy], o(p.fa), 3, col.main);  ctx.fillStyle = col.skin; ctx.fillRect(ox + p.fa[0] - 2, p.fa[1] - 2, 4, 4);
}

// Lying on the ground frame
function drawDown(ctx, ox, col) {
  ctx.fillStyle = '#111'; ctx.fillRect(ox + 9, 38, 16, 9);
  ctx.fillStyle = col.main; ctx.fillRect(ox + 10, 39, 14, 7);
  thickLine(ctx, ox + 24, 44, ox + 31, 45, 4, col.pants);
  thickLine(ctx, ox + 12, 40, ox + 18, 35, 3, col.main);
}

// Build a texture called `key` with all frames for the given colors
function makeFighterTexture(scene, key, main, dark, skin, pants) {
  const tex = scene.textures.createCanvas(key, FRAME_W * FRAMES.length, FRAME_H);
  const ctx = tex.getContext();
  const col = { main: hex(main), dark: hex(dark), skin: skin || '#e0a878', pants: pants || '#2c2c54', pantsDark: '#1b1b36' };
  FRAMES.forEach((f, i) => {
    if (f === 'down') drawDown(ctx, i * FRAME_W, col); else drawPose(ctx, i * FRAME_W, POSES[f], col);
    tex.add(f, 0, i * FRAME_W, 0, FRAME_W, FRAME_H);
  });
  tex.refresh();
}

// A simple pixel head for enemies: face, bandana in gang color, eyes, frown
function makeEnemyHead(scene, key, gangColor, skin) {
  const tex = scene.textures.createCanvas(key, 20, 20), ctx = tex.getContext();
  ctx.fillStyle = '#111'; ctx.fillRect(3, 1, 14, 18);
  ctx.fillStyle = skin; ctx.fillRect(4, 2, 12, 16);
  ctx.fillStyle = hex(gangColor); ctx.fillRect(3, 1, 14, 5); ctx.fillRect(0, 3, 4, 2);   // bandana + tail
  ctx.fillStyle = '#111'; ctx.fillRect(6, 8, 3, 2); ctx.fillRect(11, 8, 3, 2);          // angry eyes
  ctx.fillRect(7, 14, 6, 1); ctx.fillRect(6, 15, 1, 1); ctx.fillRect(13, 15, 1, 1);      // frown
  tex.refresh();
}

// Small item art: nickels, bat, bottle, crosshair, particles
function makeItemTextures(scene) {
  const coin = (key, c) => {
    const t = scene.textures.createCanvas(key, 12, 12), x = t.getContext();
    x.fillStyle = '#111'; x.beginPath(); x.arc(6, 6, 6, 0, 7); x.fill();
    x.fillStyle = hex(c); x.beginPath(); x.arc(6, 6, 5, 0, 7); x.fill();
    x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(5, 3, 2, 6);  // "N" stroke look
    x.fillStyle = 'rgba(255,255,255,0.7)'; x.fillRect(3, 3, 1, 2);
    t.refresh();
  };
  coin('nickel_copper', NICKELS.copper.color); coin('nickel_silver', NICKELS.silver.color); coin('nickel_gold', NICKELS.gold.color);
  let t = scene.textures.createCanvas('bat', 20, 6), x = t.getContext();
  x.fillStyle = '#5b3a1a'; x.fillRect(0, 2, 6, 2); x.fillStyle = '#b07a3c'; x.fillRect(6, 1, 14, 4); t.refresh();
  t = scene.textures.createCanvas('bottle', 8, 14); x = t.getContext();
  x.fillStyle = '#1e7a3a'; x.fillRect(2, 0, 4, 4); x.fillRect(0, 4, 8, 10); x.fillStyle = '#9fe0b0'; x.fillRect(1, 6, 1, 5); t.refresh();
  t = scene.textures.createCanvas('crosshair', 24, 24); x = t.getContext();
  x.strokeStyle = '#ff3030'; x.lineWidth = 2; x.beginPath(); x.arc(12, 12, 9, 0, 7); x.stroke();
  x.fillStyle = '#ff3030'; x.fillRect(11, 0, 2, 8); x.fillRect(11, 16, 2, 8); x.fillRect(0, 11, 8, 2); x.fillRect(16, 11, 8, 2); t.refresh();
  t = scene.textures.createCanvas('spark', 4, 4); x = t.getContext(); x.fillStyle = '#fff'; x.fillRect(0, 0, 4, 4); t.refresh();
  t = scene.textures.createCanvas('shadow', 24, 6); x = t.getContext();
  x.fillStyle = 'rgba(0,0,0,0.4)'; x.beginPath(); x.ellipse(12, 3, 12, 3, 0, 0, 7); x.fill(); t.refresh();
}

// Make every texture the game needs (called once by the Boot scene)
function makeAllTextures(scene) {
  FACTIONS.forEach(f => makeFighterTexture(scene, 'body_' + f.key, f.color, f.dark, '#e0a878', '#23233f'));
  const skins = ['#e0a878', '#8d5524', '#c68642', '#f1c27d'];
  LEVELS.forEach((lv, i) => {
    if (lv.type !== 'brawl') return;
    makeFighterTexture(scene, 'enemy_' + i, lv.color, Phaser.Display.Color.ValueToColor(lv.color).darken(40).color, null, '#333');
    makeFighterTexture(scene, 'boss_' + i, lv.boss.color, 0x111111, null, '#111');
    skins.forEach((s, j) => makeEnemyHead(scene, 'ehead_' + i + '_' + j, lv.color, s));
    makeEnemyHead(scene, 'bhead_' + i, lv.boss.color, '#b07850');
  });
  makeItemTextures(scene);
  makeWhip(scene);
}
// A thin whip texture for whip enemies (added later for Stage 2+)
function makeWhip(scene) {
  const t = scene.textures.createCanvas('whip', 30, 4), x = t.getContext();
  x.fillStyle = '#3b2412'; x.fillRect(0, 1, 6, 2); x.fillStyle = '#7a4a22'; x.fillRect(6, 1, 24, 1); t.refresh();
}
