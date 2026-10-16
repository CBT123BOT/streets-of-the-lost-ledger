// =====================================================================
//  MAIN: start the game. Settings live in config.js.
//  File guide: config.js (settings) • sprites.js (pixel art) • fighters.js (shared fighter code)
//  brawl.js (beat-em-up stages) • stage.js (backgrounds + HUD) • bonus.js (bonus stages)
//  scenes.js (menus) • audio.js (sound) • controls.js (keys + touch)
// =====================================================================
const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: 640, height: 360,
  pixelArt: true,                         // sharp, blocky 16-bit look
  backgroundColor: '#000000',
  parent: 'game',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, TitleScene, StoryScene, SelectScene, BrawlScene, GalleryScene, BikeScene,
          PauseScene, GameOverScene, VictoryScene, ScoresScene]
});
window.GAME = game;   // for testing in the browser console
