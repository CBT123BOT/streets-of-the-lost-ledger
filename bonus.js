// =====================================================================
//  BONUS STAGES
//  1) Bayou Shootout: a Bayou Billy style shooting gallery (mouse/tap or keys)
//  2) Turbo Ledger Tunnel: a Battletoads Turbo Tunnel style speeder bike run
// =====================================================================

// ----- Bayou Shootout -----
class GalleryScene extends Phaser.Scene {
  constructor() { super('Gallery'); }
  create() {
    this.lv = LEVELS[RUN.level]; this.timeLeft = this.lv.time; this.targets = []; this.hits = 0;
    const g = this.add.graphics();
    g.fillStyle(0x16302a).fillRect(0, 0, 640, 360);
    g.fillStyle(0x1f4a44).fillRect(0, 250, 640, 110);                       // swamp water
    // shacks and bushes where targets pop up
    this.spots = [];
    for (let i = 0; i < 4; i++) {
      const x = 40 + i * 150;
      g.fillStyle(0x5b4024).fillRect(x, 110, 120, 120); g.fillStyle(0x3b2814).fillTriangle(x - 10, 110, x + 60, 60, x + 130, 110);
      g.fillStyle(0x111111).fillRect(x + 20, 140, 32, 36).fillRect(x + 70, 140, 32, 36);
      this.spots.push([x + 36, 162], [x + 86, 162]);
    }
    for (let i = 0; i < 5; i++) { g.fillStyle(0x2f6b3a).fillCircle(60 + i * 130, 262, 30); this.spots.push([60 + i * 130, 250]); }
    this.add.text(320, 8, this.lv.name, { fontFamily: 'monospace', fontSize: '14px', color: '#ffd34d' }).setOrigin(0.5, 0);
    this.info = this.add.text(320, 28, '', { fontFamily: 'monospace', fontSize: '10px', color: '#fff' }).setOrigin(0.5, 0);
    this.add.text(320, 345, 'SHOOT the gang (bandanas). DON\'T shoot your crew!  Mouse/tap, or arrows+Z (P2: WASD+F)',
      { fontFamily: 'monospace', fontSize: '8px', color: '#ccc' }).setOrigin(0.5);
    // crosshairs: one per player (P1 follows the mouse/finger too)
    this.cross = RUN.players.map((p, i) => this.add.image(260 + i * 120, 180, 'crosshair').setDepth(100).setTint(i ? 0x66ccff : 0xffffff));
    this.pads = RUN.players.map((_, i) => makePad(this, i + 1));
    this.input.on('pointermove', ptr => { this.cross[0].setPosition(ptr.x, ptr.y); });
    this.input.on('pointerdown', ptr => { this.cross[0].setPosition(ptr.x, ptr.y); this.shoot(0); });
    this.time.addEvent({ delay: 700, loop: true, callback: () => this.popTarget() });
    this.time.addEvent({ delay: 1000, loop: true, callback: () => { if (--this.timeLeft <= 0) this.finish(); } });
    Sound.startMusic(110);
    window.BONUS = this;
  }
  popTarget() {
    if (this.done) return;
    const spot = Phaser.Utils.Array.GetRandom(this.spots);
    if (this.targets.some(t => t.spot === spot)) return;
    const friend = Math.random() < 0.25;
    const tex = friend ? 'head_' + FACTIONS[Phaser.Math.Between(0, 4)].key : 'ehead_0_' + Phaser.Math.Between(0, 3);
    const img = this.add.image(spot[0], spot[1] + 20, tex).setScale(friend ? 1.6 : 2).setDepth(10);
    this.tweens.add({ targets: img, y: spot[1], duration: 150 });
    const t = { img, spot, friend, born: this.time.now };
    this.targets.push(t);
    this.time.delayedCall(1300, () => this.removeTarget(t));
  }
  removeTarget(t) { t.img.destroy(); this.targets = this.targets.filter(x => x !== t); }
  shoot(i) {
    if (this.done) return;
    Sound.shoot(); this.cameras.main.shake(60, 0.004);
    const c = this.cross[i];
    const t = this.targets.find(t => Phaser.Math.Distance.Between(c.x, c.y, t.img.x, t.img.y) < 20);
    if (!t) return;
    RUN.players[i].score += t.friend ? -500 : 300; if (!t.friend) this.hits++;
    const txt = this.add.text(t.img.x, t.img.y - 20, t.friend ? 'OOPS -500' : '+300', { fontFamily: 'monospace', fontSize: '10px', color: t.friend ? '#f55' : '#ff0' }).setOrigin(0.5);
    this.tweens.add({ targets: txt, y: txt.y - 20, alpha: 0, duration: 700, onComplete: () => txt.destroy() });
    this.removeTarget(t);
  }
  update(time, delta) {
    const dt = delta / 1000;
    this.pads.forEach((pad, i) => {
      const r = pad.read(), c = this.cross[i];
      if (r.held.left) c.x -= 260 * dt; if (r.held.right) c.x += 260 * dt;
      if (r.held.up) c.y -= 260 * dt; if (r.held.down) c.y += 260 * dt;
      c.x = Phaser.Math.Clamp(c.x, 0, 640); c.y = Phaser.Math.Clamp(c.y, 0, 360);
      if (r.pressed.punch || r.pressed.kick) this.shoot(i);
    });
    this.info.setText('TIME ' + this.timeLeft + '   HITS ' + this.hits + '   SCORE ' + RUN.players.map(p => p.score).join(' / '));
  }
  finish() {
    if (this.done) return; this.done = true; Sound.stopMusic();
    const bonus = this.hits * 100;
    RUN.players.forEach(p => p.score += bonus);
    this.add.text(320, 180, 'BONUS OVER!\nHits ' + this.hits + '  +' + bonus, { fontFamily: 'monospace', fontSize: '20px', color: '#fff',
      align: 'center', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(200);
    this.time.delayedCall(2200, () => nextStage(this));
  }
}

// ----- Turbo Ledger Tunnel (speeder bike) -----
const LANES = [230, 280, 330];
class BikeScene extends Phaser.Scene {
  constructor() { super('Bike'); }
  create() {
    this.lv = LEVELS[RUN.level]; this.timeLeft = this.lv.time; this.speed = 220; this.obstacles = []; this.coins = [];
    this.add.rectangle(0, 0, 640, 360, 0x0a0a1e).setOrigin(0);
    // tunnel walls with scrolling stripes
    if (!this.textures.exists('tunnel')) {
      const t = this.textures.createCanvas('tunnel', 64, 200), c = t.getContext();
      c.fillStyle = '#141433'; c.fillRect(0, 0, 64, 200); c.fillStyle = '#2aa8ff'; c.fillRect(0, 0, 4, 200);
      c.fillStyle = '#222255'; for (let y = 0; y < 200; y += 20) c.fillRect(0, y, 64, 2); t.refresh();
    }
    this.wall = this.add.tileSprite(0, 0, 640, 200, 'tunnel').setOrigin(0);
    this.floor = this.add.graphics();
    this.add.text(320, 6, this.lv.name, { fontFamily: 'monospace', fontSize: '14px', color: '#7fdcff' }).setOrigin(0.5, 0).setDepth(100);
    this.info = this.add.text(320, 26, '', { fontFamily: 'monospace', fontSize: '10px', color: '#fff' }).setOrigin(0.5, 0).setDepth(100);
    this.add.text(320, 350, 'UP/DOWN change lane, JUMP (C / H) over low walls, dodge tall walls', { fontFamily: 'monospace', fontSize: '8px', color: '#aaa' }).setOrigin(0.5).setDepth(100);
    // riders: hover bike + team head
    this.riders = RUN.players.map((p, i) => {
      const fac = FACTIONS[p.faction];
      const box = this.add.container(110 - i * 40, LANES[i + 1]);
      const bike = this.add.graphics();
      bike.fillStyle(0x000000).fillRect(-22, -10, 46, 12); bike.fillStyle(fac.color).fillRect(-20, -9, 42, 9);
      bike.fillStyle(0xffffff).fillRect(18, -8, 4, 3); bike.fillStyle(0xff8800).fillRect(-26, -6, 5, 4);
      const body = this.add.sprite(-2, -6, 'body_' + fac.key, 'jump').setOrigin(0.5, 1).setScale(0.8);
      const head = this.add.image(-2, -40, 'head_' + fac.key);
      box.add([body, head, bike]);
      return { box, lane: i + 1, z: 0, vz: 0, pad: makePad(this, i + 1), hurtUntil: 0, run: p };
    });
    this.time.addEvent({ delay: 1000, loop: true, callback: () => { if (--this.timeLeft <= 0) this.finish(true); } });
    this.nextObs = 800;
    Sound.startMusic(100);
    window.BONUS = this;
  }
  update(time, delta) {
    if (this.done) return;
    const dt = delta / 1000;
    this.speed += 6 * dt;
    this.wall.tilePositionX += this.speed * dt;
    this.floor.clear(); this.floor.fillStyle(0x1b1b3a).fillRect(0, 200, 640, 160);
    for (let i = 0; i < 3; i++) { this.floor.fillStyle(0x2a2a55); for (let x = -(this.wall.tilePositionX * 1.5 % 60); x < 640; x += 60) this.floor.fillRect(x, LANES[i] + 4, 30, 2); }
    // spawn obstacles and nickels
    this.nextObs -= delta;
    if (this.nextObs <= 0) {
      this.nextObs = Math.max(450, 1100 - this.speed);
      const lane = Phaser.Math.Between(0, 2), tall = Math.random() < 0.5;
      const g = this.add.graphics();
      if (tall) { g.fillStyle(0x000000).fillRect(-8, -50, 16, 52); g.fillStyle(0xe84393).fillRect(-6, -48, 12, 48); }
      else { g.fillStyle(0x000000).fillRect(-10, -14, 20, 16); g.fillStyle(0xffcc00).fillRect(-8, -12, 16, 12); }
      g.setPosition(680, LANES[lane]).setDepth(LANES[lane]);
      this.obstacles.push({ g, lane, tall, x: 680 });
      if (Math.random() < 0.4) {
        const l2 = (lane + 1) % 3;
        const kind = Math.random() < 0.15 ? 'gold' : Math.random() < 0.4 ? 'silver' : 'copper';
        this.coins.push({ img: this.add.image(720, LANES[l2] - 16, 'nickel_' + kind).setDepth(LANES[l2]), lane: l2, kind, x: 720 });
      }
    }
    this.riders.forEach(r => {
      const p = r.pad.read();
      if (p.pressed.up && r.lane > 0) r.lane--;
      if (p.pressed.down && r.lane < 2) r.lane++;
      if (p.pressed.jump && r.z === 0) r.vz = 280;
      r.z += r.vz * dt; r.vz -= GRAVITY * dt; if (r.z < 0) { r.z = 0; r.vz = 0; }
      const ty = LANES[r.lane];
      r.y = (r.y || ty) + (ty - (r.y || ty)) * Math.min(1, dt * 12);
      r.box.setPosition(r.box.x, r.y - r.z).setDepth(r.y + 1).setAlpha(time < r.hurtUntil && Math.floor(time / 80) % 2 ? 0.3 : 1);
    });
    this.obstacles = this.obstacles.filter(o => {
      o.x -= this.speed * dt; o.g.x = o.x;
      this.riders.forEach(r => {
        if (time > r.hurtUntil && r.lane === o.lane && Math.abs(o.x - r.box.x) < 18 && (o.tall || r.z < 14)) {
          r.hurtUntil = time + 1000; r.run.score = Math.max(0, r.run.score - 300); this.crashes = (this.crashes || 0) + 1;
          Sound.hurt(); this.cameras.main.shake(150, 0.01);
        }
      });
      if (o.x < -40) { o.g.destroy(); return false; } return true;
    });
    this.coins = this.coins.filter(c => {
      c.x -= this.speed * dt; c.img.x = c.x;
      const r = this.riders.find(r => r.lane === c.lane && Math.abs(c.x - r.box.x) < 18);
      if (r) { r.run.score += NICKELS[c.kind].score; RUN.nickels[c.kind]++; Sound.coin(); c.img.destroy(); return false; }
      if (c.x < -20) { c.img.destroy(); return false; } return true;
    });
    this.info.setText('TIME ' + this.timeLeft + '   SPEED ' + Math.round(this.speed) + '   CRASHES ' + (this.crashes || 0) + '   SCORE ' + RUN.players.map(p => p.score).join(' / '));
  }
  finish() {
    if (this.done) return; this.done = true; Sound.stopMusic();
    const bonus = Math.max(0, 5000 - (this.crashes || 0) * 500);
    RUN.players.forEach(p => p.score += bonus);
    this.add.text(320, 160, 'TUNNEL CLEARED!\n+' + bonus, { fontFamily: 'monospace', fontSize: '20px', color: '#fff', align: 'center',
      stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(200);
    this.time.delayedCall(2200, () => nextStage(this));
  }
}
