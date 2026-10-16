// =====================================================================
//  STAGE ART + HUD: backgrounds drawn with code, and the top scoreboard
// =====================================================================

// Draw the background for a level. lv.scene picks the look.
function drawStage(scene, lv) {
  const g = scene.add.graphics().setDepth(-10), L = lv.length;
  g.fillStyle(lv.sky).fillRect(0, 0, L, 260);
  const rnd = (i) => (Math.sin(i * 99.13) * 10000) % 1 + 1 > 1 ? ((Math.sin(i * 99.13) * 10000) % 1 + 1) % 1 : 0.5;
  if (lv.scene === 'city') {
    g.fillStyle(0xfff3b0).fillCircle(520, 50, 22);
    for (let x = 0, i = 0; x < L; i++) {
      const w = 70 + (i * 37) % 60, h = 110 + (i * 53) % 110;
      g.fillStyle([0x3d2c6b, 0x4a3570, 0x2f2458, 0x553a7a][i % 4]).fillRect(x, 232 - h, w, h);
      g.fillStyle(0xffd34d);
      for (let wy = 232 - h + 10; wy < 220; wy += 18) for (let wx = x + 8; wx < x + w - 10; wx += 16) if ((wx + wy + i) % 3) g.fillRect(wx, wy, 6, 8);
      if (i % 5 === 2) { g.fillStyle(0x2ecc71).fillRect(x + 10, 150, w - 20, 14); }        // LOCz graffiti sign
      x += w + 4;
    }
    g.fillStyle(0x8a8a9a).fillRect(0, 232, L, 36); g.fillStyle(0xd0d0d8).fillRect(0, 264, L, 4);
    g.fillStyle(lv.street).fillRect(0, 268, L, 92);
    g.fillStyle(0xf2c230); for (let x = 0; x < L; x += 48) g.fillRect(x, 318, 24, 3);
    for (let x = 200; x < L; x += 380) { g.fillStyle(0x222222).fillRect(x, 120, 4, 112); g.fillStyle(0xfff3b0).fillRect(x - 6, 116, 16, 6); } // street lamps
  } else if (lv.scene === 'warehouse') {
    g.fillStyle(0x5a3a2a).fillRect(0, 40, L, 220);                                     // brick wall
    g.fillStyle(0x6e4836); for (let y = 44; y < 256; y += 10) for (let x = (y / 10 % 2) * 12; x < L; x += 24) g.fillRect(x, y, 22, 8);
    for (let x = 60; x < L; x += 300) { g.fillStyle(0x222222).fillRect(x, 70, 90, 60); g.fillStyle(0x334a66).fillRect(x + 4, 74, 82, 52); }
    for (let x = 150; x < L; x += 260) { g.fillStyle(0x8b6b3a).fillRect(x, 210, 40, 40); g.lineStyle(2, 0x5b4320).strokeRect(x, 210, 40, 40); }
    g.fillStyle(0x777777).fillRect(0, 252, L, 16);
    g.fillStyle(lv.street).fillRect(0, 268, L, 92);
    for (let x = 0; x < L; x += 64) { g.fillStyle(0x3d342c).fillRect(x, 268, 2, 92); }
    // conveyor belts (they push you to the right!)
    scene.belts = [];
    const belt = scene.textures.exists('belt') ? null : (() => { const t = scene.textures.createCanvas('belt', 16, 12), c = t.getContext();
      c.fillStyle = '#222'; c.fillRect(0, 0, 16, 12); c.fillStyle = '#ffcc00'; c.fillRect(0, 0, 6, 12); t.refresh(); })();
    for (let x = 500; x < L - 700; x += 700) {
      const b = { x, y: 300, w: 260, h: 18 };
      b.sprite = scene.add.tileSprite(x, 300, 260, 18, 'belt').setOrigin(0, 0).setDepth(-5);
      scene.add.text(x + 130, 292, '>> CONVEYOR >>', { fontFamily: 'monospace', fontSize: '8px', color: '#ffcc00' }).setOrigin(0.5).setDepth(-4);
      scene.belts.push(b);
    }
  } else if (lv.scene === 'bayou') {
    g.fillStyle(0xd8f0a0).fillCircle(480, 60, 26);
    for (let x = 0; x < L; x += 90) {                                                   // cypress trees with moss
      const h = 120 + (x * 7) % 80;
      g.fillStyle(0x2a1d12).fillRect(x + 20, 250 - h, 12, h);
      g.fillStyle(0x24452f).fillCircle(x + 26, 250 - h, 34); g.fillStyle(0x6f8f5a);
      for (let m = 0; m < 4; m++) g.fillRect(x + 8 + m * 10, 250 - h + 10, 2, 30 + m * 5);
    }
    g.fillStyle(0x1f4a44).fillRect(0, 236, L, 32);                                     // swamp water
    g.fillStyle(0x3f7a6e); for (let x = 0; x < L; x += 30) g.fillRect(x, 246 + (x % 3) * 6, 14, 2);
    g.fillStyle(lv.street).fillRect(0, 268, L, 92);                                     // muddy boardwalk
    g.fillStyle(0x6b5232); for (let x = 0; x < L; x += 26) g.fillRect(x, 268, 24, 92);
    g.fillStyle(0x4a3820); for (let x = 0; x < L; x += 26) g.fillRect(x + 24, 268, 2, 92);
  } else {
    // FUD hideout: dark interior, pillars, neon signs
    g.fillStyle(0x24182a).fillRect(0, 30, L, 238);
    for (let x = 0; x < L; x += 220) { g.fillStyle(0x3a2a44).fillRect(x, 30, 30, 238); g.fillStyle(0x4a3656).fillRect(x + 4, 30, 6, 238); }
    for (let x = 110; x < L; x += 440) {
      g.fillStyle(0xe84393).fillRect(x, 90, 80, 4).fillRect(x, 120, 80, 4);
      scene.add.text(x + 40, 107, 'FUD', { fontFamily: 'monospace', fontSize: '20px', color: '#ff7ac0' }).setOrigin(0.5).setDepth(-9);
    }
    g.fillStyle(0x111111).fillRect(0, 258, L, 10);
    g.fillStyle(lv.street).fillRect(0, 268, L, 92);
    g.fillStyle(0x352a3c); for (let x = 0; x < L; x += 40) for (let y = 268; y < 360; y += 40) if ((x + y) / 40 % 2) g.fillRect(x, y, 40, 40);
  }
}

// ----- HUD: player portraits, health, lives, score, boss bar -----
function makeHud(scene) {
  const fix = o => o.setScrollFactor(0).setDepth(5000);
  scene.hud = scene.players.map((p, i) => {
    const x = i === 0 ? 8 : 330;
    fix(scene.add.rectangle(x, 6, 300, 38, 0x000000, 0.55).setOrigin(0, 0));
    fix(scene.add.image(x + 16, 25, 'head_' + p.fac.key).setScale(1.2));
    const style = { fontFamily: 'monospace', fontSize: '10px', color: SETTINGS.HUD_TEXT_COLOR };
    fix(scene.add.text(x + 34, 8, (i + 1) + 'P ' + p.name + ' [' + p.fac.team + ']', style));
    fix(scene.add.rectangle(x + 34, 22, 120, 8, 0x330000).setOrigin(0, 0));
    const bar = fix(scene.add.rectangle(x + 34, 22, 120, 8, SETTINGS.HEALTH_COLOR).setOrigin(0, 0));
    const info = fix(scene.add.text(x + 34, 32, '', style));
    const wpn = fix(scene.add.text(x + 160, 20, '', style));
    return { bar, info, wpn };
  });
  scene.stageText = fix(scene.add.text(320, 50, scene.lv.gang, { fontFamily: 'monospace', fontSize: '9px', color: '#ffd34d' }).setOrigin(0.5, 0));
  scene.bossBg = fix(scene.add.rectangle(170, 345, 300, 8, 0x330000).setOrigin(0, 0.5).setVisible(false));
  scene.bossBar = fix(scene.add.rectangle(170, 345, 300, 8, 0xff3030).setOrigin(0, 0.5).setVisible(false));
  scene.bossName = fix(scene.add.text(320, 334, '', { fontFamily: 'monospace', fontSize: '9px', color: '#fff' }).setOrigin(0.5, 1));
  if (DEBUG) scene.dbg = fix(scene.add.text(4, 60, '', { fontFamily: 'monospace', fontSize: '8px', color: '#0f0' }));
}

function updateHud(scene, time) {
  scene.players.forEach((p, i) => {
    const h = scene.hud[i];
    h.bar.width = 120 * Math.max(0, p.hp) / p.maxHp;
    h.info.setText('LIVES ' + Math.max(0, p.run.lives) + '  SCORE ' + p.run.score + (p.alive ? '' : '  OUT'));
    h.wpn.setText((p.weapon ? p.weapon.toUpperCase() : '') + (time < p.glowUntil ? ' ' + p.fac.special : ''));
  });
  const b = scene.boss;
  const show = !!(b && b.alive);
  scene.bossBg.setVisible(show); scene.bossBar.setVisible(show);
  scene.bossName.setText(show ? b.name : '');
  if (show) scene.bossBar.width = 300 * Math.max(0, b.hp) / b.maxHp;
  if (scene.dbg) scene.dbg.setText('DEBUG wave ' + scene.waveIndex + ' enemies ' + scene.enemies.length + ' x ' + Math.round(scene.players[0].x) +
    '\nK=kill all  B=boss  N=next stage');
}
