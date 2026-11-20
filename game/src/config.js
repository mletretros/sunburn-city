export const STEP = 1 / 60;
export const WORLD = {
  seed: 'palma-97', cell: 58, columns: 7, rows: 9, road: 15, sidewalk: 3.4,
  north: -406, shore: -43, boardwalk: -16, southMargin: 24, oceanSize: 2800,
  spawn: { x: -10.6, z: 64, heading: 0 }, park: { col: 1, row: 7 },
};
const zone = (name, id, tint, height, colors) => ({ name, zone: id, tint, height, colors });
export const DISTRICTS = {
  palma: zone('Palma Strip', '01', '#ffb899', [8, 19], [0xefb49f, 0xf3d3ab, 0x72c9bd, 0xe59cbd]),
  neon: zone('Neon Row', '02', '#cfb3ff', [24, 69], [0xa2aecb, 0xc49da9, 0x81bdbf, 0xc4b8d3]),
  dock: zone('Dockside', '03', '#e0b382', [8, 16], [0x8daba8, 0xc79877, 0xb4b3a0]),
  coral: zone('Coral Heights', '04', '#a8d9ae', [6, 17], [0xe5c19e, 0xbfcfbc, 0xdab8c5]),
  causeway: zone('The Causeway', '05', '#abd6ed', [8, 24], [0xc1c8cd, 0xf0ba8e, 0x9bbfb2]),
};
export const PALETTE = {
  skyTop: 0x67bccd, skyHorizon: 0xfbd4a2, skyDusk: 0x9f729b, sun: 0xffd2a3,
  duskSun: 0xff956c, fill: 0xffe1bc, bounce: 0x8fa6c0, sand: 0xeac799,
  park: 0x6f9e83, foliage: [0x316f63, 0x4b8c70, 0x72a47a], asphalt: 0x434e58,
  roadEdge: 0xd5c7ac, lane: 0xf8cf76, pavement: 0xdab5a0, concrete: 0xc8b49a,
  curb: 0xf8dbc0, iron: 0x263b45, glass: 0x294e61, teal: 0x4bd9bc,
  coral: 0xf27e6e, cream: 0xffe8be,
};
export const PLAYER = {
  walk: 5, sprint: 9, jump: 6, gravity: 19, radius: .38, step: .3,
  response: 14, airResponse: 4, turn: 12, health: 100, armour: 0, cash: 240,
  colors: { skin: 0xba7959, hair: 0x302630, jacket: 0xf47168, trim: 0xffd89e, pants: 0x314752, shoes: 0xead2ac, stripe: 0xffffff },
};
export const CAMERA = { pitch: .28, pitchMin: -.18, pitchMax: 1.05, distance: 8, height: 2.7, sensitivity: .0025 };
export const QUALITY = { low: { ratio: 1, shadow: false }, standard: { ratio: 1.5, shadow: true }, high: { ratio: 2, shadow: true } };
export const LIGHT = { sunX: -93, sunY: 100, sunZ: 51, shadowRadius: 90, resnap: 12, fogNear: 180, fogFar: 820 };
export const DRIVE = { acceleration: 13, brake: 23, reverse: 7, drag: .3, friction: 1.9, handbrake: 9, steer: .52, driftGrip: 1.4, grip: 10, kerb: .3, impact: 5, exitSpeed: 4, reach: 2.7, starter: { x: -5, z: 64, heading: 0 } };
export const STREET_LIFE = { walkers: 56, cars: 22, far: 200, near: 30, visibleRange: 130 };
