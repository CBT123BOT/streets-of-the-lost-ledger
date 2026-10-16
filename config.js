// =====================================================================
//  EASY-TO-EDIT SETTINGS  (practice changing these!)
//  Shape colors look like 0xRRGGBB.  Text colors look like '#RRGGBB'.
// =====================================================================
const SETTINGS = {
  TITLE_TEXT:     'CRYPTO BROS',
  SUBTITLE_TEXT:  'Streets of the Lost Ledger',
  TITLE_COLOR:    '#ffd34d',
  HUD_TEXT_COLOR: '#ffffff',
  HEALTH_COLOR:   0xe53935,
  START_LIVES:    3,
  CONTINUES:      3,
  PLAYER_MAX_HP:  100,
  PUNCH_DAMAGE:   6,
  KICK_DAMAGE:    9,
  WALK_SPEED:     110,
  MUSIC_ON:       true
};

// The 5 faction leaders you can pick (from GAME_PLAN.md, FINAL Oct 16, 2026).
// "key" matches the picture files in assets/ (head_gold.png, portrait_gold.png ...)
// The 5 faction leaders you can pick (from GAME_PLAN.md, FINAL Oct 16, 2026).
// "key" matches the picture files in assets/ (head_gold.png ...).
// Stats make each team play differently: speed (walk), power (damage x), reach (attack range px).
// special = their Gold Nickel finisher (Battletoads-style over-the-top smash).
const FACTIONS = [
  { key: 'gold',    team: 'Leroy Gold',    leader: 'Frankie Pumpkins', piece: '#0878', color: 0xffc400, dark: 0x9a6a00, glow: 0xffe066,
    speed: 1.0, power: 1.0, reach: 22, special: 'BIG FIST',       style: 'All-rounder' },
  { key: 'red',     team: "Sho'nuff Red",  leader: 'Gordo Holdsworth', piece: '#1051', color: 0xe02020, dark: 0x7a0c0c, glow: 0xff5050,
    speed: 0.85, power: 1.35, reach: 20, special: 'BIG BOOT',     style: 'Power brawler' },
  { key: 'blue',    team: 'Ripple Drops',  leader: 'Bruno Wagmi',      piece: '#0364', color: 0x2aa8ff, dark: 0x0b4c8c, glow: 0x7fdcff,
    speed: 1.3, power: 0.8, reach: 20, special: 'LIGHTNING DROP', style: 'Speedster' },
  { key: 'purple',  team: 'Purple Kush',   leader: 'Benjamin Blunt',   piece: '#0958', color: 0x9b3dd6, dark: 0x4b1670, glow: 0xd08cff,
    speed: 0.95, power: 0.95, reach: 30, special: 'KUSH CLOUD',   style: 'Long reach' },
  { key: 'diamond', team: 'Diamond Hands', leader: 'Butch Fancypants', piece: '#0615', color: 0xbfefff, dark: 0x5a8fa8, glow: 0xffffff,
    speed: 0.9, power: 1.1, reach: 22, special: 'DIAMOND STORM', style: 'Tank (takes less damage)', armor: 0.7 }
];

// The levels, in order. type: 'brawl' (beat-em-up), 'gallery' (shooting bonus), 'bike' (speeder bonus).
// Gang names after the LOCz are PLACEHOLDERS until Rusty picks real ones.
// scene = background look. hazard 'conveyor' pushes fighters sideways.
const LEVELS = [
  { type: 'brawl', name: 'Stage 1: City Street', gang: 'The LOCz (D1)', tag: 'LOCz', scene: 'city',
    color: 0x2ecc71, sky: 0x2b1b4f, street: 0x3a3a44, length: 2200, waves: [3, 4, 5], enemyTypes: ['thug', 'thug', 'bat'],
    boss: { name: 'LOCz Boss "D1 Don"', hp: 240, color: 0x117a3e, size: 1.35 } },
  { type: 'brawl', name: 'Stage 2: The Warehouse', gang: 'The Rug Pullers (D2 placeholder)', tag: 'RUGZ', scene: 'warehouse', hazard: 'conveyor',
    color: 0xe67e22, sky: 0x241a14, street: 0x4a4038, length: 2400, waves: [4, 5, 6], enemyTypes: ['thug', 'whip', 'bat'],
    boss: { name: 'Big Rug (brute)', hp: 320, color: 0xa04000, size: 1.6, brute: true } },
  { type: 'gallery', name: 'BONUS: Bayou Shootout', time: 30 },
  { type: 'brawl', name: 'Stage 3: The Bayou', gang: 'The Swamp Shillz (D3 placeholder)', tag: 'SHILLZ', scene: 'bayou',
    color: 0x7fbf3f, sky: 0x16302a, street: 0x3d4a2a, length: 2600, waves: [5, 6, 6], enemyTypes: ['thug', 'whip', 'brute'],
    boss: { name: 'Gator Pump', hp: 380, color: 0x3e6b1f, size: 1.5 } },
  { type: 'bike', name: 'BONUS: Turbo Ledger Tunnel', time: 35 },
  { type: 'brawl', name: 'Stage 4: The FUD Hideout', gang: 'The FUD Syndicate (final 10% placeholder)', tag: 'FUD', scene: 'hideout',
    color: 0xe84393, sky: 0x1a0a1f, street: 0x2a2030, length: 2800, waves: [5, 6, 7], enemyTypes: ['thug', 'whip', 'bat', 'brute'],
    boss: { name: 'FUD Lord', hp: 460, color: 0x8e1a5a, size: 1.6, brute: true } }
];

// Enemy types: hp, speed, damage, reach, extra look
const ENEMY_TYPES = {
  thug:  { hp: 30, speed: 55, dmg: 6,  reach: 20, scale: 1.0 },
  bat:   { hp: 34, speed: 50, dmg: 9,  reach: 30, scale: 1.0, weapon: 'bat' },
  whip:  { hp: 28, speed: 60, dmg: 7,  reach: 44, scale: 1.0, weapon: 'whip' },
  brute: { hp: 70, speed: 38, dmg: 13, reach: 24, scale: 1.3 }
};

// Mickel Nickel drops (IN-GAME ONLY, never real prizes). chance = out of 1.0
const NICKELS = {
  copper: { chance: 0.35, heal: 20, score: 100,  color: 0xc26a2a },
  silver: { chance: 0.15, heal: 50, score: 500,  color: 0xd8dde3 },
  gold:   { chance: 0.07, heal: 30, score: 1000, color: 0xffd700, specialSeconds: 8 }
};

// Story intro (from STORY.md / LORE.md canon: the 32,569 lost ledgers)
const STORY_LINES = [
  'Ledgers #1 to #32,569 vanished in 2012.',
  'The Bros&Ho\'s were born in those lost pages.',
  'Now a gang called THE LOCz has stolen',
  'the LOST LEDGER, the last copy of the gap...',
  'and every crew in the city wants it.',
  '',
  'Five crews. One ledger. Take it back.'
];

// ---- STUBS for later (v1 does NOT use these yet) ----
// Holder check: later we will READ the public XRP Ledger (no wallets, keys or seeds, ever)
// to see which Crypto Bros pieces an address holds, and let holders play their own NFT head.
function checkHolderReadOnly(publicAddress) { return Promise.resolve([]); }   // TODO later
// TwiN pair unlock: holding a matched Polaroid + 3D TwiN unlocks a bonus special move.
const TWIN_UNLOCKS = { enabled: false, note: 'Matched Polaroid + 3D TwiN pair unlocks a special move (coming later).' };
