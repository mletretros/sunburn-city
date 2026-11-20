// World units are metres; simulation times are seconds and angles radians.
export const STEP = 1 / 60;
export const WORLD = {
  seed: 'palma-97', columns: 7, rows: 9, cell: 58, road: 15, sidewalk: 3.4,
  north: -406, southMargin: 24, shore: -43, boardwalk: -16, oceanSize: 2800,
  spawn: { x: -9.1, z: 64, heading: .11 }, park: { col: 1, row: 7 },
};
const district = (name, zone, tint, height, colors) => ({ name, zone, tint, height, colors });
export const DISTRICTS = {
  palma: district('Palma Strip', '01', '#f4a680', [7, 16], [0xff987f, 0xffcb96, 0x87d7cc, 0xffe2b3, 0xe8a5be]),
  neon: district('Neon Row', '02', '#b6a1e5', [20, 72], [0x7eabc5, 0xdca9a3, 0x97a6c5, 0x85bdba, 0xdbb9a1]),
  dock: district('Dockside', '03', '#d3a469', [7, 16], [0xaab1a4, 0xc88a6b, 0xb9ac98, 0xa7c5cc]),
  coral: district('Coral Heights', '04', '#87c8a1', [4, 9], [0xe2b99b, 0xcbcf9c, 0xffc0a6, 0xc3c9e2, 0xd0e0cc]),
  causeway: district('The Causeway', '05', '#93b8d0', [6, 15], [0xaeb8c2, 0xffce9e, 0xadc6b7, 0xeeac9e]),
};
export const PALETTE = {
  skyTop: 0x51a6cf, skyHorizon: 0xfbd5a9, skyDusk: 0xa65f9b,
  sun: 0xffd1a0, duskSun: 0xff905b, fill: 0xfff2df, bounce: 0xb8abc1,
  sand: 0xf5ca91, park: 0x82a36e, foliage: [0x467963, 0x539c71, 0x77aa68, 0x307a68, 0x8db76e],
  asphalt: 0x555565, roadEdge: 0xece0c6, lane: 0xe9b752,
  pavement: 0xe6bdab, concrete: 0xc4a798, curb: 0xffe0c8,
  iron: 0x36434c, glass: 0x25434d, teal: 0x34baa9, coral: 0xf35c68, cream: 0xffeac8,
};
export const PLAYER = {
  walk: 4.8, sprint: 8.5, jump: 5.7, gravity: 18, radius: .38, step: .29,
  response: 16, airResponse: 4.5, turn: 14, health: 100, armour: 0, cash: 240,
  colors: { skin: 0xb87050, hair: 0x2f2028, jacket: 0xeb6960, trim: 0xffd38e,
    shirt: 0xf8ddbb, pants: 0x263f54, shoes: 0xeedbc0, bag: 0x205e60, stripe: 0x73e4be },
};
export const CAMERA = {
  foot: { distance: 5.1, target: 1.48, shoulder: .7, fov: 63 },
  driving: { distance: 9.2, target: 1.95, shoulder: 0, fov: 66 },
  sensitivity: .0023, pitch: .2, pitchMin: -.32, pitchMax: 1.12,
  follow: 13, recovery: 7, radius: .25, clearance: .15, far: 1220,
};
export const QUALITY = {
  low: { ratio: .65, shadow: 0 }, standard: { ratio: 1.15, shadow: 1024 }, high: { ratio: 1.55, shadow: 2048 },
};
export const LIGHT = { sunX: -93, sunY: 62, sunZ: 51, shadowRadius: 74, resnap: 12, fogNear: 95, fogFar: 610 };
export const DRIVE = {
  acceleration: 10.8, brake: 23, reverse: 7.5, drag: .46, friction: 1.45,
  steer: .59, grip: 12, driftGrip: 2.2, handbrake: 5.5, reach: 2.05, exitSpeed: 3.2,
  kerb: .27, impact: 2.8, lookAhead: 3.3, speedFov: 8, starter: { x: -6.38, z: 58.9, heading: 0 },
};
export const STREET_LIFE = {
  cars: 22, walkers: 30, driverPool: 4, near: 48, far: 230, visibleRange: 178,
  stop: 11.4, green: 8, allRed: 1, streetSpeed: [9, 14], sidewalkInset: 1.75,
  pedestrianSpeed: [1.14, 1.83], fearRange: 10, carThreatSpeed: 8, earshot: 27,
};
