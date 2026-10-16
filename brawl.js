// =====================================================================
//  BRAWL SCENE: the beat-'em-up stages (Double Dragon style)
// =====================================================================
const STREET_TOP = 268, STREET_BOTTOM = 350;

class BrawlScene extends Phaser.Scene {
  constructor() { super('Brawl'); }

  // ----- CHUNK A: set up the stage, players, HUD -----
  create() {
    this.lv = LEVELS[RUN.level];
    this.lvIndex = RUN.level;
    this.enemies = []; this.items = []; this.projectiles = [];
    this.waveIndex = 0; this.waveActive = false; this.bossSpawned = false; this.cleared = false;
    this.minScroll = 0; this.lockScroll = null;
    const L = this.lv.length;
    this.checkpoints = this.lv.waves.map((_, i) => 380 + i * ((L - 1100) / this.lv.waves.length));
    drawStage(this, this.lv);
    this.cameras.main.setBounds(0, 0, L, 360);

    // Players
    this.players = RUN.players.map((p, i) => {
      const fac = FACTIONS[p.faction];
      const pl = makeFighter(this, { x: 80 + i * 30, y: 300 + i * 25, texture: 'body_' + fac.key, head: 'head_' + fac.key,
        isPlayer: true, hp: SETTINGS.PLAYER_MAX_HP, name: fac.leader, fac });
      pl.glowColor = fac.key === 'diamond' ? 0xffffff : fac.glow;   // Diamond Hands glows WHITE
      pl.run = p; pl.pad = makePad(this, i + 1); pl.index = i;
      pl.alive = p.lives >= 0;
      if (!pl.alive) { pl.box.setVisible(false); pl.shadow.setVisible(false); }
      return pl;
    });
    makeHud(this);
    this.showBanner(this.lv.name + '\n' + this.lv.gang, 2200);
    Sound.startMusic(this.lv.scene === 'hideout' ? 120 : 140);

    // Pause and debug keys
    this.input.keyboard.on('keydown-P', () => this.pause());
    this.input.keyboard.on('keydown-ESC', () => this.pause());
    if (DEBUG) {
      this.input.keyboard.on('keydown-K', () => this.enemies.forEach(e => this.damage(this.players[0], e, 999, true)));
      this.input.keyboard.on('keydown-B', () => { this.waveIndex = this.lv.waves.length; this.players.forEach(p => p.x = L - 500); });
      this.input.keyboard.on('keydown-N', () => this.stageClear());
    }
    window.BRAWL = this;   // handy for testing
  }

  pause() { if (this.cleared) return; this.scene.launch('Pause', { from: 'Brawl' }); this.scene.pause(); }

  showBanner(text, ms) {
    const t = this.add.text(320, 140, text, { fontFamily: 'monospace', fontSize: '20px', color: '#fff', align: 'center',
      stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setScrollFactor(0).setDepth(2000);
    this.time.delayedCall(ms, () => t.destroy());
    return t;
  }

  // ----- CHUNK B: every frame -----
  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    const tp = TOUCH.pause && !this.prevTouchPause; this.prevTouchPause = TOUCH.pause;   // tap (not hold) the pause button
    if (tp) { this.pause(); return; }
    this.players.forEach(p => { if (p.alive) this.updatePlayer(p, time, dt); });
    this.enemies.forEach(e => this.updateEnemy(e, time, dt));
    this.updateProjectiles(dt);
    this.updateItems(time);
    this.updateCamera(dt);
    this.updateWaves(time);
    if (this.lv.hazard === 'conveyor') this.conveyor(dt);
    [...this.players, ...this.enemies].forEach(f => { if (f.box.visible) placeFighter(f, time); });
    updateHud(this, time);
    // remove enemies that finished dying
    this.enemies = this.enemies.filter(e => { if (e.gone) { e.box.destroy(); e.shadow.destroy(); return false; } return true; });
  }

  // ----- CHUNK C: player controls (walk, punch combo, kick, jump kick, grab, throw) -----
  updatePlayer(p, time, dt) {
    const pad = p.pad.read(), H = pad.held, P = Object.assign({}, pad.pressed), fac = p.fac;
    // Input buffer: a button pressed a split-second too early (mid-punch) still counts when you're free
    if (P.punch) p.bufPunch = time; if (P.kick) p.bufKick = time;
    p.t -= dt * 1000;
    const busy = p.t > 0;
    if (p.state === 'down' || p.state === 'hurt') {
      this.knockMotion(p, dt);
      if (!busy) { if (p.hp <= 0) return this.playerDied(p, time); p.state = 'idle'; if (p.wasDown) p.invulnUntil = time + 900; p.wasDown = false; }
      setFrame(p, p.state === 'down' ? 'down' : 'hurt'); return;
    }
    // In the air: jump physics, kick for a JUMP KICK
    if (p.state === 'jump') {
      p.x += p.vx * dt; p.z += p.vz * dt; p.vz -= GRAVITY * dt;
      if (P.kick || P.punch) p.jumpKick = true;
      setFrame(p, p.jumpKick ? 'jumpkick' : 'jump');
      if (p.jumpKick) this.tryHit(p, 'jumpkick', SETTINGS.KICK_DAMAGE * 1.4, fac.reach + 6, true, time);
      if (p.z <= 0) { p.z = 0; p.state = 'idle'; p.jumpKick = false; p.hitList = null; }
      this.clampToScreen(p); return;
    }
    // Holding an enemy: punch = knee (3 knees knock him down), kick = THROW over your shoulder
    if (p.state === 'grab') {
      const e = p.grabbing;
      if (!e || !e.alive || e.state !== 'grabbed') { p.state = 'idle'; p.grabbing = null; return; }
      e.x = p.x + p.facing * 16; e.y = p.y + 1; e.facing = -p.facing;
      setFrame(p, busy ? 'punch2' : 'grab'); setFrame(e, 'hurt');
      if (!busy && P.punch) {
        p.t = 220; p.knees = (p.knees || 0) + 1; Sound.hit();
        this.damage(p, e, SETTINGS.PUNCH_DAMAGE * fac.power, p.knees >= 3, true);
        if (p.knees >= 3) { p.state = 'idle'; p.grabbing = null; }
      } else if (!busy && P.kick) {
        // Throw: enemy flies behind you and crashes down
        e.state = 'idle'; p.state = 'attack'; p.t = 350; setFrame(p, 'throw');
        e.x = p.x - p.facing * 10; e.facing = p.facing;
        this.damage(p, e, 14 * fac.power, true, true, -p.facing);
        e.vx = -p.facing * 220; p.grabbing = null; Sound.punch();
      } else if (time - p.grabStart > 1800) { e.state = 'idle'; p.state = 'idle'; p.grabbing = null; }
      return;
    }
    if (p.state === 'attack') {
      if (p.attackKind) this.tryHit(p, p.attackKind, p.attackDmg, p.attackReach, p.attackKnock, time, p.attackBehind);
      if (!busy) { p.state = 'idle'; p.hitList = null; p.attackKind = null; }
      return;
    }
    // Free to act (use buffered presses from the last 0.2 s)
    if (time - (p.bufPunch || -9999) < 200) { P.punch = true; p.bufPunch = -9999; }
    else if (time - (p.bufKick || -9999) < 200) { P.kick = true; p.bufKick = -9999; }
    const spd = SETTINGS.WALK_SPEED * fac.speed * (time < p.glowUntil ? 1.3 : 1);
    let moving = false;
    if (H.left)  { p.x -= spd * dt; p.facing = -1; moving = true; }
    if (H.right) { p.x += spd * dt; p.facing = 1; moving = true; }
    if (H.up)    { p.y -= spd * 0.6 * dt; moving = true; }
    if (H.down)  { p.y += spd * 0.6 * dt; moving = true; }
    p.y = Phaser.Math.Clamp(p.y, STREET_TOP, STREET_BOTTOM);
    this.clampToScreen(p);
    setFrame(p, moving ? (Math.floor(time / 140) % 2 ? 'walk1' : 'walk2') : 'idle');
    // Grab: walk into a dizzy (hurt) enemy up close
    if (moving) {
      const e = this.enemies.find(e => e.alive && (e.state === 'hurt' || e.dizzy) && !e.boss && Math.abs(e.x - p.x) < 20 && Math.abs(e.y - p.y) < 8);
      if (e) { p.state = 'grab'; p.grabbing = e; e.state = 'grabbed'; p.grabStart = time; p.knees = 0; return; }
    }
    if (P.jump) { p.state = 'jump'; p.vz = 300; p.vx = (H.left ? -1 : H.right ? 1 : 0) * spd; Sound.whiff(); return; }
    if (P.punch) {
      // Bottle: throw it
      if (p.weapon === 'bottle') { this.throwBottle(p); return; }
      // Punch combo: 1, 2, then a big uppercut that knocks down
      p.combo = time - p.lastPunch < 450 ? p.combo + 1 : 1; p.lastPunch = time;
      const big = p.combo >= 3; if (big) p.combo = 0;
      const wpn = p.weapon === 'bat';
      this.startAttack(p, big ? 'punch2' : 'punch', (wpn ? 14 : SETTINGS.PUNCH_DAMAGE) * fac.power * (big ? 1.6 : 1),
        fac.reach + (wpn ? 14 : 0), big || wpn, big ? 300 : 200);
      if (wpn && --p.weaponUses <= 0) p.weapon = null;
      Sound.punch(); return;
    }
    if (P.kick) {
      // Kick while holding BACK = back elbow (hits the guy behind you)
      const back = (H.left && p.facing === 1) || (H.right && p.facing === -1);
      if (back) { this.startAttack(p, 'throw', SETTINGS.PUNCH_DAMAGE * 1.3 * fac.power, fac.reach, false, 260, true); }
      else this.startAttack(p, 'kick', SETTINGS.KICK_DAMAGE * fac.power, fac.reach + 6, false, 300);
      Sound.punch();
    }
  }

  startAttack(f, frame, dmg, reach, knock, ms, behind) {
    f.state = 'attack'; f.t = ms; f.attackKind = frame; f.attackDmg = dmg; f.attackReach = reach;
    f.attackKnock = knock; f.attackBehind = behind; f.hitList = [];
    setFrame(f, frame);
  }

  // Check who this attack hits (each target only once per swing)
  tryHit(att, frame, dmg, reach, knock, time, behind) {
    att.hitList = att.hitList || [];
    const targets = att.isPlayer ? this.enemies : this.players;
    targets.forEach(t => {
      if (!t.alive || att.hitList.includes(t) || t.state === 'down' || time < t.invulnUntil) return;
      if (inRange(att, t, reach, behind)) {
        att.hitList.push(t);
        this.damage(att, t, dmg, knock, false, behind ? -att.facing : att.facing);
      }
    });
  }

  // ----- CHUNK D: taking damage, knockdowns, dying -----
  damage(att, t, dmg, knock, noPush, dir) {
    if (!t.alive) return;
    dir = dir || att.facing;
    if (t.fac && t.fac.armor) dmg *= t.fac.armor;
    if (att.isPlayer && this.time.now < att.glowUntil) dmg *= 1.5;
    t.hp -= dmg; Sound.hit();
    this.spark(t.x, t.y - 30 * t.scale - t.z);
    if (att.isPlayer) { att.run.score += Math.round(dmg * 5); }
    t.flashing = true; t.body.setTintFill(0xffffff);
    this.time.delayedCall(70, () => { t.flashing = false; t.body.clearTint(); });
    if (t.grabbedBy) t.grabbedBy = null;
    // 3 quick hits in a row knock anyone down; boss needs bigger hits
    t.hitsTaken = (this.time.now - t.lastHurt < 900) ? t.hitsTaken + 1 : 1; t.lastHurt = this.time.now;
    if (t.boss && t.hitsTaken < 5 && t.hp > 0) knock = knock && t.hitsTaken >= 3;
    if (t.hp <= 0 || knock || (!t.boss && t.hitsTaken >= 4)) {
      t.state = 'down'; t.t = t.hp <= 0 ? 1000 : 900; t.vx = noPush ? dir * 40 : dir * 130; t.z = 1; t.vz = 160; t.wasDown = true; t.hitsTaken = 0;
      if (t.grabbing) { t.grabbing.state = 'idle'; t.grabbing = null; }
      if (!t.isPlayer && t.weapon === 'bat' && Math.random() < 0.6) { this.dropItem('bat', t.x, t.y); t.weapon = null; }
    } else {
      t.state = t.state === 'grabbed' ? 'grabbed' : 'hurt'; t.t = 280; t.vx = noPush ? 0 : dir * 60;
    }
    if (t.isPlayer) Sound.hurt();
  }

  knockMotion(f, dt) {
    f.x += f.vx * dt; f.vx *= 0.9;
    if (f.z > 0 || f.vz > 0) { f.z += f.vz * dt; f.vz -= GRAVITY * dt; if (f.z < 0) { f.z = 0; f.vz = 0; } }
    if (f.isPlayer || f.entered) this.clampToScreen(f);
  }

  playerDied(p, time) {
    p.run.lives--;
    if (p.run.lives >= 0) {
      p.hp = p.maxHp; p.state = 'idle'; p.invulnUntil = time + 2000; p.weapon = null;
      p.x = this.cameras.main.scrollX + 120; p.z = 60; p.vz = 0; p.state = 'jump';
      this.showBanner(p.name + ' is back!', 1200);
    } else {
      p.alive = false; p.box.setVisible(false); p.shadow.setVisible(false);
      if (this.players.every(q => !q.alive)) this.gameOver();
    }
  }

  gameOver() {
    Sound.stopMusic();
    this.time.delayedCall(800, () => this.scene.start('GameOver'));
  }

  clampToScreen(f) {
    // on phones, keep players a bit away from the edges so thumbs/buttons don't hide them
    const sx = this.cameras.main.scrollX, m = (IS_TOUCH && f.isPlayer) ? 44 : 12;
    f.x = Phaser.Math.Clamp(f.x, sx + m, sx + 640 - m);
  }

  // ----- CHUNK E: enemy brains -----
  spawnEnemy(type, x, y) {
    const T = ENEMY_TYPES[type], i = this.lvIndex, lv = this.lv;
    const hpScale = 1 + this.lvIndex * 0.15;
    const e = makeFighter(this, { x, y, texture: 'enemy_' + i, head: 'ehead_' + i + '_' + Phaser.Math.Between(0, 3),
      hp: Math.round(T.hp * hpScale), scale: T.scale, isPlayer: false, type, T, name: lv.tag });
    if (T.weapon) { e.weapon = T.weapon; }
    e.facing = -1; e.nextAttack = this.time.now + 800 + Math.random() * 800;
    this.enemies.push(e);
    return e;
  }

  spawnBoss() {
    const b = this.lv.boss, i = this.lvIndex, sx = this.cameras.main.scrollX;
    const e = makeFighter(this, { x: sx + 600, y: 310, texture: 'boss_' + i, head: 'bhead_' + i, hp: b.hp, scale: b.size,
      isPlayer: false, boss: true, type: b.brute ? 'brute' : 'thug', name: b.name,
      T: { speed: b.brute ? 45 : 60, dmg: b.brute ? 16 : 12, reach: 26 } });
    e.facing = -1; e.nextAttack = this.time.now + 1500;
    this.boss = e; this.enemies.push(e);
    this.showBanner('BOSS: ' + b.name, 1800);
  }

  updateEnemy(e, time, dt) {
    e.t -= dt * 1000;
    // once an enemy has walked onto the screen, keep it on screen (so nobody gets stuck off-camera)
    const sx = this.cameras.main.scrollX;
    if (!e.entered && e.x > sx + 14 && e.x < sx + 626) e.entered = true;
    if (e.entered) this.clampToScreen(e);
    if (e.state === 'grabbed') return;
    if (e.state === 'down' || e.state === 'hurt') {
      this.knockMotion(e, dt);
      setFrame(e, e.state === 'down' ? 'down' : 'hurt');
      if (e.t <= 0) {
        if (e.hp <= 0) return this.enemyDied(e);
        e.state = 'idle'; if (e.wasDown) { e.invulnUntil = time + 500; e.wasDown = false; e.dizzy = false; }
        else if (Math.random() < 0.35) e.dizzy = true;      // sometimes stays dizzy = easy to grab
        e.nextAttack = time + 500;
      }
      return;
    }
    if (e.state === 'dying') return;
    // pick the closest living player
    const live = this.players.filter(p => p.alive);
    if (!live.length) { setFrame(e, 'idle'); return; }
    const p = live.reduce((a, b) => Math.abs(a.x - e.x) < Math.abs(b.x - e.x) ? a : b);
    if (e.state === 'windup') {               // about to swing: short pause so players can react
      setFrame(e, 'punch2');
      if (e.t <= 0) { this.startAttack(e, e.type === 'brute' ? 'kick' : 'punch', e.T.dmg, e.T.reach, e.type === 'brute' || e.boss, 260); Sound.punch(); }
      return;
    }
    if (e.state === 'attack') { this.tryHit(e, e.attackKind, e.attackDmg, e.attackReach, e.attackKnock, time); if (e.t <= 0) { e.state = 'idle'; } return; }
    // Brute bosses CHARGE across the screen (Abobo style)
    if (e.state === 'charge') {
      e.x += e.facing * 220 * dt; setFrame(e, Math.floor(time / 90) % 2 ? 'walk1' : 'walk2');
      this.tryHit(e, 'punch', e.T.dmg, 24, true, time);
      if (e.t <= 0) e.state = 'idle';
      return;
    }
    const dx = p.x - e.x, dy = p.y - e.y, want = e.T.reach * 0.8 + 6;
    e.facing = dx > 0 ? 1 : -1;
    let moving = false;
    if (Math.abs(dx) > want) { e.x += Math.sign(dx) * e.T.speed * dt; moving = true; }
    else if (Math.abs(dx) < want - 10) { e.x -= Math.sign(dx) * e.T.speed * 0.5 * dt; moving = true; }
    if (Math.abs(dy) > 3) { e.y += Math.sign(dy) * e.T.speed * 0.6 * dt; moving = true; }
    if (e.dizzy) { moving = false; setFrame(e, 'hurt'); if (time > e.nextAttack + 1200) e.dizzy = false; return; }
    setFrame(e, moving ? (Math.floor(time / 160) % 2 ? 'walk1' : 'walk2') : 'idle');
    if (e.boss && this.lv.boss.brute && time > e.nextAttack && Math.abs(dy) < 10 && Math.abs(dx) > 120) {
      e.state = 'charge'; e.t = 900; e.nextAttack = time + 3000; return;
    }
    if (time > e.nextAttack && Math.abs(dx) < e.T.reach + 12 && Math.abs(dy) < 10) {
      e.state = 'windup'; e.t = e.boss ? 280 : 380; e.nextAttack = time + (e.boss ? 900 : 1300) + Math.random() * 700;
    }
  }

  enemyDied(e) {
    e.alive = false; e.state = 'dying';
    const killer = this.players.find(p => p.alive) || this.players[0];
    killer.run.score += e.boss ? 5000 : 300;
    this.tweens.add({ targets: [e.box, e.shadow], alpha: 0, duration: 500, yoyo: false, repeat: 0,
      onComplete: () => { e.gone = true; } });
    this.rollNickel(e.x, e.y);
    if (e.boss) this.stageClear();
  }

  // ----- CHUNK F: Mickel Nickel drops + weapon pickups -----
  rollNickel(x, y) {
    const r = Math.random(), boost = DROPS ? 0.6 : 0;
    let kind = null;
    if (r < NICKELS.gold.chance + boost * 0.4) kind = 'gold';
    else if (r < NICKELS.gold.chance + NICKELS.silver.chance + boost * 0.7) kind = 'silver';
    else if (r < NICKELS.gold.chance + NICKELS.silver.chance + NICKELS.copper.chance + boost) kind = 'copper';
    if (kind) this.dropItem(kind, x, y);
  }

  dropItem(kind, x, y) {
    const sx = this.cameras.main.scrollX; x = Phaser.Math.Clamp(x, sx + 20, sx + 620);
    const tex = ['copper', 'silver', 'gold'].includes(kind) ? 'nickel_' + kind : kind;
    const img = this.add.image(x, y - 4, tex).setDepth(y - 2);
    this.tweens.add({ targets: img, y: y - 10, duration: 400, yoyo: true, repeat: -1 });
    this.items.push({ kind, x, y, img, born: this.time.now });
  }

  updateItems(time) {
    this.items = this.items.filter(it => {
      const p = this.players.find(p => p.alive && p.state !== 'down' && Math.abs(p.x - it.x) < 16 && Math.abs(p.y - it.y) < 12);
      if (!p) { if (time - it.born > 12000) { it.img.destroy(); return false; } return true; }
      it.img.destroy();
      this.pickup(p, it.kind, time);
      return false;
    });
  }

  pickup(p, kind, time) {
    if (kind === 'bat' || kind === 'bottle') { p.weapon = kind; p.weaponUses = kind === 'bat' ? 8 : 1; Sound.select(); return; }
    const N = NICKELS[kind];
    p.hp = Math.min(p.maxHp, p.hp + N.heal); p.run.score += N.score; Sound.coin();
    this.floatText(p.x, p.y - 60, kind.toUpperCase() + ' NICKEL +' + N.score, N.color);
    RUN.nickels[kind]++;
    if (kind === 'gold') this.special(p, time);
  }

  floatText(x, y, msg, color) {
    const t = this.add.text(x, y, msg, { fontFamily: 'monospace', fontSize: '10px', color: '#' + color.toString(16).padStart(6, '0'),
      stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(3000);
    this.tweens.add({ targets: t, y: y - 30, alpha: 0, duration: 1200, onComplete: () => t.destroy() });
  }

  // ----- CHUNK G: GOLD NICKEL SPECIAL (Battletoads-style over-the-top smash) -----
  special(p, time) {
    const fac = p.fac;
    p.glowUntil = time + NICKELS.gold.specialSeconds * 1000;
    Sound.special();
    this.cameras.main.flash(250, (p.glowColor >> 16) & 255, (p.glowColor >> 8) & 255, p.glowColor & 255);
    this.cameras.main.shake(400, 0.012);
    const sx = this.cameras.main.scrollX;
    const label = this.add.text(320, 100, fac.special + '!!', { fontFamily: 'monospace', fontSize: '32px',
      color: '#' + p.glowColor.toString(16).padStart(6, '0'), stroke: '#000', strokeThickness: 6 }).setOrigin(0.5).setScrollFactor(0).setDepth(3000);
    this.tweens.add({ targets: label, scale: 1.4, alpha: 0, duration: 1400, onComplete: () => label.destroy() });
    // a giant version of the move: big fist / boot / lightning / smoke / diamonds
    const g = this.add.graphics().setDepth(2500);
    const c = p.glowColor;
    if (fac.key === 'gold' || fac.key === 'red') {
      // GIANT fist (gold) or boot (red) slams across the screen
      g.fillStyle(0x000000).fillRect(-6, -46, 132, 92); g.fillStyle(c).fillRect(0, -40, 120, 80);
      if (fac.key === 'gold') { g.fillStyle(0x000000); for (let i = 0; i < 4; i++) g.fillRect(90, -36 + i * 20, 30, 3); }
      else { g.fillStyle(0x222222).fillRect(0, 26, 130, 14); }
      g.setPosition(sx - 140, p.y - 40);
      this.tweens.add({ targets: g, x: sx + 780, duration: 600, onComplete: () => g.destroy() });
    } else if (fac.key === 'blue') {
      // Lightning bolts drop on every enemy
      this.enemies.forEach(e => { g.lineStyle(4, c); g.beginPath(); g.moveTo(e.x, 0);
        for (let y = 40; y < e.y; y += 40) g.lineTo(e.x + (y / 40 % 2 ? 12 : -12), y); g.lineTo(e.x, e.y - 20); g.strokePath(); });
      this.tweens.add({ targets: g, alpha: 0, duration: 700, onComplete: () => g.destroy() });
    } else if (fac.key === 'purple') {
      // A huge purple smoke cloud rolls over the street
      for (let i = 0; i < 18; i++) g.fillStyle(c, 0.6).fillCircle(sx + Math.random() * 640, 240 + Math.random() * 110, 30 + Math.random() * 30);
      this.tweens.add({ targets: g, alpha: 0, duration: 1600, onComplete: () => g.destroy() });
    } else {
      // Diamond storm: white diamonds rain down
      for (let i = 0; i < 40; i++) { const x = sx + Math.random() * 640, y = Math.random() * 350;
        g.fillStyle(0xffffff).fillTriangle(x, y - 6, x - 4, y, x + 4, y).fillStyle(0xbfefff).fillTriangle(x - 4, y, x + 4, y, x, y + 8); }
      this.tweens.add({ targets: g, y: 60, alpha: 0, duration: 1200, onComplete: () => g.destroy() });
    }
    // everyone on screen gets smashed
    this.time.delayedCall(250, () => this.enemies.forEach(e => {
      if (e.alive && e.x > sx - 20 && e.x < sx + 660) this.damage(p, e, e.boss ? 60 : 999, true, false, e.x > p.x ? 1 : -1);
    }));
  }

  // Bottles: thrown in a straight line
  throwBottle(p) {
    p.weapon = null; this.startAttack(p, 'punch', 0, 0, false, 200); p.attackKind = null;
    const img = this.add.image(p.x, p.y - 30, 'bottle').setDepth(p.y);
    this.projectiles.push({ img, x: p.x, y: p.y, vx: p.facing * 320, owner: p, life: 1.4 });
    Sound.whiff();
  }

  updateProjectiles(dt) {
    this.projectiles = this.projectiles.filter(b => {
      b.x += b.vx * dt; b.life -= dt; b.img.x = b.x; b.img.angle += 900 * dt;
      const hit = this.enemies.find(e => e.alive && e.state !== 'down' && Math.abs(e.x - b.x) < 14 && Math.abs(e.y - b.y) < 14);
      if (hit) this.damage(b.owner, hit, 20, true, false, Math.sign(b.vx));
      if (hit || b.life <= 0) { b.img.destroy(); return false; }
      return true;
    });
  }

  spark(x, y) {
    for (let i = 0; i < 5; i++) {
      const s = this.add.image(x, y, 'spark').setDepth(3000).setTint(0xffee88);
      this.tweens.add({ targets: s, x: x + Phaser.Math.Between(-18, 18), y: y + Phaser.Math.Between(-18, 18), alpha: 0, duration: 250, onComplete: () => s.destroy() });
    }
  }

  // ----- CHUNK H: camera, waves, boss, stage clear -----
  updateCamera(dt) {
    const cam = this.cameras.main, live = this.players.filter(p => p.alive);
    if (!live.length) return;
    if (this.lockScroll !== null) { cam.scrollX += (this.lockScroll - cam.scrollX) * Math.min(1, dt * 4); return; }
    const lead = Math.max(...live.map(p => p.x)), back = Math.min(...live.map(p => p.x));
    let target = Math.min(lead - 360, back - 40 + 0);
    target = Math.max(target, this.minScroll);                      // never scroll backwards
    target = Math.min(target, this.lv.length - 640);
    if (target > cam.scrollX) cam.scrollX = target;
    this.minScroll = cam.scrollX;
  }

  updateWaves(time) {
    if (this.cleared) return;
    const live = this.players.filter(p => p.alive); if (!live.length) return;
    const lead = Math.max(...live.map(p => p.x));
    if (this.waveActive) {
      if (this.enemies.every(e => !e.alive) && this.waveSpawned >= this.waveSize) {
        this.waveActive = false; this.lockScroll = null; this.waveIndex++;
        this.goText = this.showBanner('GO  >>>', 1500);
      } else if (this.waveSpawned < this.waveSize && time > this.nextSpawn && this.enemies.filter(e => e.alive).length < 4) {
        const sx = this.cameras.main.scrollX, side = Math.random() < 0.7 ? 1 : -1;
        const types = this.lv.enemyTypes;
        this.spawnEnemy(types[Phaser.Math.Between(0, types.length - 1)], side > 0 ? sx + 660 : sx - 20, Phaser.Math.Between(STREET_TOP, STREET_BOTTOM));
        this.waveSpawned++; this.nextSpawn = time + 900;
      }
      return;
    }
    if (this.waveIndex < this.lv.waves.length && lead > this.checkpoints[this.waveIndex]) {
      this.waveActive = true; this.waveSize = this.lv.waves[this.waveIndex] + (this.players.filter(p => p.alive).length > 1 ? 2 : 0);
      this.waveSpawned = 0; this.nextSpawn = time; this.lockScroll = this.cameras.main.scrollX;
      if (Math.random() < 0.5) this.dropItem(Math.random() < 0.5 ? 'bottle' : 'bat', this.lockScroll + 500, Phaser.Math.Between(STREET_TOP, STREET_BOTTOM));
    } else if (this.waveIndex >= this.lv.waves.length && !this.bossSpawned && lead > this.lv.length - 520) {
      this.bossSpawned = true; this.lockScroll = this.lv.length - 640; this.minScroll = this.lockScroll;
      this.time.delayedCall(600, () => this.spawnBoss());
    }
  }

  // Warehouse conveyor belts push anyone standing on them
  conveyor(dt) {
    this.belts.forEach(b => {
      b.sprite.tilePositionX -= 60 * dt;
      [...this.players, ...this.enemies].forEach(f => {
        if (f.alive && f.z === 0 && f.x > b.x && f.x < b.x + b.w && f.y > b.y - 4 && f.y < b.y + b.h) f.x += 50 * dt;
      });
    });
  }

  stageClear() {
    if (this.cleared) return; this.cleared = true;
    this.players.forEach(p => { if (p.alive) p.run.score += 2000; });
    Sound.stopMusic(); Sound.coin();
    this.showBanner('STAGE CLEAR!\n+2000', 2500);
    this.time.delayedCall(2600, () => nextStage(this));
  }
}
