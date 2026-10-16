// =====================================================================
//  MENUS: boot, title, story, character select, pause, game over,
//  victory, and the local leaderboard (saved in this browser only)
// =====================================================================
const PARAMS = new URLSearchParams(location.search);
const DEBUG = PARAMS.get('debug') === '1';          // ?debug=1 shows debug keys
const DROPS = PARAMS.get('drops') === '1';          // ?drops=1 makes nickels drop way more (testing)
let RUN = null;                                     // the current run: players, level, score...
const T = (scene, x, y, msg, size, color) => scene.add.text(x, y, msg, { fontFamily: 'monospace', fontSize: (size || 12) + 'px',
  color: color || '#fff', align: 'center', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
const hexStr = c => '#' + c.toString(16).padStart(6, '0');

// Go to whatever comes after the current level (brawl / bonus / victory)
function nextStage(scene) {
  RUN.level++;
  RUN.players.forEach(p => { if (p.lives < 0 && RUN.players.some(q => q.lives >= 0)) p.lives = 0; });   // co-op buddy rejoins
  if (RUN.level >= LEVELS.length) return scene.scene.start('Victory');
  startLevel(scene);
}
function startLevel(scene) {
  const lv = LEVELS[RUN.level];
  scene.scene.start(lv.type === 'brawl' ? 'Brawl' : lv.type === 'gallery' ? 'Gallery' : 'Bike');
}

// ---- Leaderboard in localStorage ----
const Scores = {
  KEY: 'cryptoBrosLostLedgerScores',
  load() { try { return JSON.parse(localStorage.getItem(this.KEY)) || []; } catch (e) { return []; } },
  add(entry) { const all = this.load(); all.push(entry); all.sort((a, b) => b.score - a.score);
    try { localStorage.setItem(this.KEY, JSON.stringify(all.slice(0, 10))); } catch (e) {} return all.slice(0, 10); }
};
function saveRunScores() {
  RUN.players.forEach(p => { const f = FACTIONS[p.faction];
    Scores.add({ name: f.leader, team: f.team, score: p.score, stage: Math.min(RUN.level + 1, LEVELS.length), date: new Date().toISOString().slice(0, 10) }); });
}

// ---- Boot: load the head pictures and draw all the sprite art ----
class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    FACTIONS.forEach(f => { this.load.image('head_' + f.key, 'assets/head_' + f.key + '.png');
      this.load.image('portrait_' + f.key, 'assets/portrait_' + f.key + '.png'); });
  }
  create() {
    makeAllTextures(this);
    setupTouch();
    const lvl = parseInt(PARAMS.get('level'), 10);
    if (DEBUG && lvl >= 1) {      // ?debug=1&level=3 jumps straight in (1P, Frankie)
      RUN = newRun([parseInt(PARAMS.get('pick') || '0', 10)]); RUN.level = Math.min(lvl - 1, LEVELS.length - 1);
      return startLevel(this);
    }
    this.scene.start('Title');
  }
}
function newRun(picks) {
  return { level: 0, continues: SETTINGS.CONTINUES, nickels: { copper: 0, silver: 0, gold: 0 },
    players: picks.map(fi => ({ faction: fi, lives: SETTINGS.START_LIVES - 1, score: 0 })) };
}

// Small helper: menus listen to keyboard + touch through Player 1's pad
function menuPad(scene) { const a = makePad(scene, 1), b = makePad(scene, 2), enter = scene.input.keyboard.addKey('ENTER');
  let prevEnter = false, prevStart = false;
  return () => { const r1 = a.read(), r2 = b.read(); const e = enter.isDown && !prevEnter; prevEnter = enter.isDown;
    const s = TOUCH.start && !prevStart; prevStart = TOUCH.start;
    return { p1: r1, p2: r2, start: e || s || r1.pressed.punch || r1.pressed.jump }; }; }

// ---- Title ----
class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }
  create() {
    const g = this.add.graphics();
    g.fillStyle(0x1a1030).fillRect(0, 0, 640, 360);
    for (let i = 0; i < 40; i++) g.fillStyle(0x3d2c6b).fillRect(i * 16, 360 - 60 - (i * 37) % 90, 15, 200);
    FACTIONS.forEach((f, i) => this.add.image(80 + i * 120, 250, 'portrait_' + f.key).setScale(0.55));
    T(this, 320, 70, SETTINGS.TITLE_TEXT, 44, SETTINGS.TITLE_COLOR).setStroke('#7a2a00', 8);
    T(this, 320, 115, SETTINGS.SUBTITLE_TEXT, 18, '#ffffff');
    this.blink = T(this, 320, 165, IS_TOUCH ? 'TAP TO START' : 'PRESS ENTER / Z / START', 14, '#ffd34d');
    T(this, 320, 345, 'v1  •  original fan-made pixel art  •  Mickel Nickels here are in-game only', 8, '#aaa');
    const top = Scores.load()[0];
    if (top) T(this, 320, 188, 'HIGH SCORE ' + top.score + '  ' + top.name + ' [' + top.team + ']', 9, '#7fdcff');
    this.pad = menuPad(this);
    this.input.keyboard.on('keydown-L', () => this.scene.start('Scores'));
    this.input.on('pointerdown', () => { Sound.init(); this.go(); });
    window.CUR = this;
  }
  go() { if (this.went) return; this.went = true; Sound.init(); Sound.select(); this.scene.start('Story'); }
  update(time) { this.blink.setVisible(Math.floor(time / 400) % 2 === 0); if (this.pad().start) this.go(); }
}

// ---- Story intro (Lost Ledger) ----
class StoryScene extends Phaser.Scene {
  constructor() { super('Story'); }
  create() {
    this.add.rectangle(0, 0, 640, 360, 0x000000).setOrigin(0);
    T(this, 320, 40, 'THE LOST LEDGER', 22, '#ffd34d');
    STORY_LINES.forEach((l, i) => { const t = T(this, 320, 90 + i * 24, l, 13, '#e0e0ff').setAlpha(0);
      this.tweens.add({ targets: t, alpha: 1, delay: 400 + i * 700, duration: 400 }); });
    T(this, 320, 340, 'ENTER / Z to continue', 10, '#888');
    this.pad = menuPad(this); this.input.on('pointerdown', () => this.go());
    this.time.delayedCall(9000, () => this.go());
    Sound.startMusic(180);
  }
  go() { if (this.went) return; this.went = true; this.scene.start('Select'); }
  update() { if (this.pad().start && this.time.now > 300) this.go(); }
}

// ---- Character select (1P or 2P co-op) ----
class SelectScene extends Phaser.Scene {
  constructor() { super('Select'); }
  create() {
    this.add.rectangle(0, 0, 640, 360, 0x120a22).setOrigin(0);
    T(this, 320, 18, 'CHOOSE YOUR CREW LEADER', 18, '#ffd34d');
    this.cards = FACTIONS.map((f, i) => {
      const x = 72 + i * 124;
      const frame = this.add.rectangle(x, 130, 112, 170, f.dark).setStrokeStyle(3, f.color);
      this.add.image(x, 95, 'portrait_' + f.key).setScale(0.78);
      const fighter = this.add.sprite(x - 22, 210, 'body_' + f.key, 'idle').setOrigin(0.5, 1).setScale(1.2);
      this.add.image(x - 22 + 0, 210 - 1.2 * 39, 'head_' + f.key).setScale(1.2);
      T(this, x, 152, f.team, 10, hexStr(f.color));
      T(this, x + 24, 188, f.leader.split(' ').join('\n'), 8, '#fff');
      T(this, x, 228, f.piece + '  ' + f.style, 7, '#ccc');
      T(this, x, 240, 'SPD ' + f.speed + ' PWR ' + f.power + ' RCH ' + f.reach, 7, '#ccc');
      T(this, x, 252, 'SPECIAL: ' + f.special, 7, hexStr(f.glow));
      return { frame, fighter };
    });
    this.sel = [0, 1]; this.joined = [true, false]; this.ready = [false, false];
    this.cursors = [T(this, 0, 275, 'P1 ▲', 12, '#ffd34d'), T(this, 0, 290, 'P2 ▲', 12, '#7fdcff').setVisible(false)];
    this.help = T(this, 320, 320, (IS_TOUCH ? 'TAP a leader to pick' : 'P1: arrows + Z to pick   •   P2: press F to JOIN (WASD + F)') + '\nTwiN pair specials & holder heads: coming soon', 9, '#bbb');
    this.pad = menuPad(this);
    // tap a card on touch screens
    this.cards.forEach((c, i) => c.frame.setInteractive().on('pointerdown', () => { this.sel[0] = i; this.confirm(0); }));
    window.CUR = this;
  }
  confirm(i) { this.ready[i] = true; Sound.select(); this.cards[this.sel[i]].frame.setFillStyle(0xffffff, 0.3); this.check(); }
  check() {
    if (this.joined.every((j, i) => !j || this.ready[i]) && !this.went) {
      this.went = true;
      const picks = this.joined[1] ? this.sel.slice(0, 2) : [this.sel[0]];
      RUN = newRun(picks);
      this.time.delayedCall(400, () => startLevel(this));
    }
  }
  update(time) {
    const m = this.pad();
    [m.p1, m.p2].forEach((r, i) => {
      if (i === 1 && !this.joined[1]) { if (r.pressed.punch) { this.joined[1] = true; this.cursors[1].setVisible(true); Sound.select(); } return; }
      if (this.ready[i]) return;
      if (r.pressed.left)  { this.sel[i] = (this.sel[i] + 4) % 5; Sound.whiff(); }
      if (r.pressed.right) { this.sel[i] = (this.sel[i] + 1) % 5; Sound.whiff(); }
      if (r.pressed.punch || (i === 0 && m.start && !r.pressed.punch && !r.pressed.jump)) this.confirm(i);
    });
    this.cursors.forEach((c, i) => c.setX(72 + this.sel[i] * 124));
    this.cards.forEach((c, i) => c.fighter.setFrame(this.sel.slice(0, this.joined[1] ? 2 : 1).includes(i) ? (Math.floor(time / 200) % 2 ? 'walk1' : 'punch') : 'idle'));
  }
}

// ---- Pause overlay ----
class PauseScene extends Phaser.Scene {
  constructor() { super('Pause'); }
  init(d) { this.from = d.from; }
  create() {
    this.add.rectangle(0, 0, 640, 360, 0x000000, 0.6).setOrigin(0);
    T(this, 320, 150, 'PAUSED', 32, '#ffd34d'); T(this, 320, 195, IS_TOUCH ? 'Tap to resume' : 'P / ESC to resume', 12);
    Sound.muted = true;
    const resume = () => { Sound.muted = false; this.scene.resume(this.from); this.scene.stop(); };
    this.input.keyboard.once('keydown-P', resume); this.input.keyboard.once('keydown-ESC', resume);
    this.input.once('pointerdown', resume);
    this.resume = resume; this.prev = TOUCH.pause;
  }
  // tapping the on-screen pause button again also resumes
  update() { if (TOUCH.pause && !this.prev) this.resume(); this.prev = TOUCH.pause; }
}

// ---- Game over + continue countdown ----
class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOver'); }
  create() {
    this.add.rectangle(0, 0, 640, 360, 0x000000).setOrigin(0);
    T(this, 320, 100, 'GAME OVER', 40, '#e53935');
    this.count = 9;
    this.canContinue = RUN.continues > 0;
    this.msg = T(this, 320, 170, '', 14, '#fff');
    T(this, 320, 220, 'Score: ' + RUN.players.map(p => p.score).join(' / '), 12, '#ffd34d');
    this.pad = menuPad(this);
    this.timer = this.time.addEvent({ delay: 1000, loop: true, callback: () => { if (--this.count < 0) this.end(); } });
    this.input.on('pointerdown', () => this.cont());
    window.CUR = this;
  }
  cont() {
    if (!this.canContinue || this.done) return; this.done = true;
    RUN.continues--; RUN.players.forEach(p => { p.lives = SETTINGS.START_LIVES - 1; p.score = Math.floor(p.score / 2); });
    startLevel(this);
  }
  end() { if (this.done) return; this.done = true; saveRunScores(); this.scene.start('Scores'); }
  update() {
    this.msg.setText(this.canContinue ? 'CONTINUE? ' + Math.max(0, this.count) + '\nPress ENTER / Z  (' + RUN.continues + ' left, score halves)' : 'No continues left');
    if (this.pad().start) this.canContinue ? this.cont() : this.end();
  }
}

// ---- Victory ----
class VictoryScene extends Phaser.Scene {
  constructor() { super('Victory'); }
  create() {
    this.add.rectangle(0, 0, 640, 360, 0x0a1a10).setOrigin(0);
    T(this, 320, 60, 'THE LOST LEDGER IS YOURS!', 24, '#ffd34d');
    RUN.players.forEach((p, i) => { const f = FACTIONS[p.faction];
      this.add.image(220 + i * 200, 160, 'portrait_' + f.key).setScale(0.8);
      T(this, 220 + i * 200, 230, f.leader + '\n[' + f.team + ']\n' + p.score, 11, hexStr(f.color)); });
    T(this, 320, 290, 'Nickels grabbed: ' + RUN.nickels.copper + ' copper, ' + RUN.nickels.silver + ' silver, ' + RUN.nickels.gold + ' gold', 10, '#ccc');
    T(this, 320, 330, 'ENTER for the leaderboard', 10, '#888');
    saveRunScores(); Sound.special();
    this.pad = menuPad(this); this.time.delayedCall(800, () => { this.ok = true; });
    this.input.on('pointerdown', () => this.ok && this.scene.start('Scores'));   // tap to continue
  }
  update() { if (this.ok && this.pad().start) this.scene.start('Scores'); }
}

// ---- Leaderboard ----
class ScoresScene extends Phaser.Scene {
  constructor() { super('Scores'); }
  create() {
    this.add.rectangle(0, 0, 640, 360, 0x120a22).setOrigin(0);
    T(this, 320, 30, 'LEADERBOARD (this device)', 18, '#ffd34d');
    const all = Scores.load();
    if (!all.length) T(this, 320, 160, 'No scores yet. Go get one!', 12);
    all.forEach((s, i) => { const f = FACTIONS.find(f => f.team === s.team);
      T(this, 320, 70 + i * 22, (i + 1) + '. ' + String(s.score).padStart(7, ' ') + '  ' + s.name.padEnd(17, ' ') + ' [' + s.team + ']  stage ' + s.stage, 11, f ? hexStr(f.color) : '#fff'); });
    T(this, 320, 340, 'ENTER / Z for title', 10, '#888');
    this.pad = menuPad(this); this.time.delayedCall(600, () => { this.ok = true; });
    this.input.on('pointerdown', () => this.ok && this.scene.start('Title'));
  }
  update() { if (this.ok && this.pad().start) this.scene.start('Title'); }
}
