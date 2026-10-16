// =====================================================================
//  FIGHTERS: the shared code for players AND enemies.
//  Everyone uses the same body art; we swap the head and team colors.
// =====================================================================
const GRAVITY = 900;   // how fast jumpers fall back down

// Build one fighter on screen. opts: x, y, texture, head, isPlayer, hp, scale, name
function makeFighter(scene, opts) {
  const f = Object.assign({
    x: 0, y: 300, z: 0, vz: 0, vx: 0, facing: 1, scale: 1, state: 'idle', t: 0,
    hp: 100, maxHp: 100, combo: 0, lastPunch: 0, invulnUntil: 0, hitsTaken: 0, lastHurt: 0,
    weapon: null, weaponUses: 0, grabbing: null, grabbedBy: null, glowUntil: 0, alive: true, cooldown: 0
  }, opts);
  f.maxHp = f.hp;
  f.shadow = scene.add.image(f.x, f.y, 'shadow').setScale(f.scale);
  f.box = scene.add.container(f.x, f.y);
  f.body = scene.add.sprite(0, 0, opts.texture, 'idle').setOrigin(0.5, 1);
  f.head = scene.add.image(0, 0, opts.head);
  f.held = scene.add.image(0, 0, 'bat').setVisible(false);      // weapon in hand
  f.box.add([f.body, f.head, f.held]);
  f.glowFx = null;
  return f;
}

// Show a frame and keep the head + weapon lined up with the body
function setFrame(f, frame) {
  f.body.setFrame(frame);
  const hp = HEAD_POS[frame] || HEAD_POS.idle;
  f.head.setPosition(hp[0] - 16, hp[1] - 48);
  f.head.setAngle(frame === 'down' ? -90 : 0);
  const hand = (POSES[frame] || POSES.idle).fa;
  f.held.setVisible(!!f.weapon && frame !== 'down');
  if (f.weapon) {
    f.held.setTexture(f.weapon === 'whip' ? 'whip' : f.weapon);
    const swing = frame === 'punch' || frame === 'punch2' || frame === 'grab';
    f.held.setPosition(hand[0] - 16 + 6, hand[1] - 48).setAngle(swing ? 0 : -60).setOrigin(0.1, 0.5);
  }
}

// Draw the fighter where it is right now (called every frame)
function placeFighter(f, time) {
  f.box.setPosition(Math.round(f.x), Math.round(f.y - f.z));
  f.box.scaleX = f.facing * f.scale; f.box.scaleY = f.scale;
  f.box.setDepth(f.y);
  f.shadow.setPosition(f.x, f.y).setDepth(f.y - 1);
  // blink while invulnerable (after getting up / respawning)
  f.box.setAlpha(time < f.invulnUntil && Math.floor(time / 80) % 2 ? 0.4 : 1);
  // glowing aura while a Gold Nickel special is active
  if (time < f.glowUntil) {
    const c = f.glowColor;
    f.body.setTint(Math.floor(time / 90) % 2 ? c : 0xffffff);
  } else if (!f.flashing) f.body.clearTint();
}

// Is target in front of attacker, within reach, and on the same street depth?
function inRange(att, tgt, reach, behind) {
  const dx = (tgt.x - att.x) * att.facing * (behind ? -1 : 1);
  return dx > -6 && dx < reach * att.scale + 10 && Math.abs(tgt.y - att.y) < 14 && Math.abs(tgt.z - att.z) < 30;
}
