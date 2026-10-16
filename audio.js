// =====================================================================
//  SOUND: tiny original chiptune sounds made live with WebAudio (no files)
// =====================================================================
const Sound = {
  ctx: null, musicTimer: null, step: 0, muted: false,
  // Browsers only allow sound after the first tap/key press, so we start it then
  init() {
    if (this.ctx) return;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; }
  },
  // Play one beep: wave type, start pitch, end pitch, length in seconds, volume
  beep(type, f1, f2, len, vol) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(Math.max(f2, 20), t + len);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
    o.connect(g); g.connect(this.ctx.destination); o.start(t); o.stop(t + len);
  },
  punch()  { this.beep('square', 220, 80, 0.08, 0.15); },
  hit()    { this.beep('sawtooth', 160, 40, 0.12, 0.2); },
  whiff()  { this.beep('triangle', 600, 300, 0.05, 0.08); },
  coin()   { this.beep('square', 988, 988, 0.06, 0.12); setTimeout(() => this.beep('square', 1319, 1319, 0.15, 0.12), 60); },
  special(){ for (let i = 0; i < 6; i++) setTimeout(() => this.beep('square', 300 + i * 150, 900 + i * 200, 0.15, 0.15), i * 70); },
  shoot()  { this.beep('sawtooth', 900, 60, 0.15, 0.2); },
  select() { this.beep('square', 660, 880, 0.08, 0.12); },
  hurt()   { this.beep('square', 140, 70, 0.15, 0.18); },
  // Background music: a looping bass line + melody, one note every ~0.14s
  startMusic(tempo) {
    this.init(); this.stopMusic();
    if (!this.ctx || !SETTINGS.MUSIC_ON) return;
    const bass = [55, 55, 82, 55, 65, 65, 98, 73], mel = [440, 0, 523, 587, 0, 659, 587, 523, 0, 440, 392, 0, 440, 0, 0, 0];
    this.musicTimer = setInterval(() => {
      if (this.muted) return;
      const s = this.step++;
      if (s % 2 === 0) this.beep('triangle', bass[(s / 2) % 8 | 0] * 2, bass[(s / 2) % 8 | 0] * 2, 0.2, 0.12);
      const m = mel[s % 16]; if (m) this.beep('square', m, m, 0.1, 0.035);
    }, tempo || 140);
  },
  stopMusic() { if (this.musicTimer) clearInterval(this.musicTimer); this.musicTimer = null; }
};
