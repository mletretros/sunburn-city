import { PLAYER, DISTRICTS } from '../config.js';
import { MISSIONS } from './story.js';
export const SLOT = 'sunburn-city.slot.v1';
export const VERSION = 2;
const states = new Set(['offered', 'active', 'failed', 'complete']), reputation = [0];
for (const job of MISSIONS) reputation.push(reputation.at(-1) + job.rewards.reputation);
const number = (value, fallback, max, min = 0) => Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
const count = (value, fallback, max) => Math.floor(number(value, fallback, max));
const coordinate = (value, fallback) => number(value, fallback, 10000, -10000);
const hasPose = record => Number.isFinite(record?.x) && Number.isFinite(record.z) && Number.isFinite(record.heading);
function decodeCar(record) {
  return hasPose(record) && Number.isFinite(record.health) ? { heading: record.heading, x: coordinate(record.x, 0), z: coordinate(record.z, 0), health: number(record.health, 100, 100) } : null;
}
function decodeStory(record, legacyIndex) {
  const index = count(record?.index, legacyIndex, MISSIONS.length), sequence = MISSIONS[index]?.objectives, step = count(record?.step, 0, sequence ? sequence.length - 1 : 0);
  return { index, step, state: states.has(record?.state) ? record.state : 'offered', remaining: number(record?.remaining, sequence?.[step]?.time ?? 0, 600),
    survived: number(record?.survived, 0, 60), failure: typeof record?.failure === 'string' ? record.failure.slice(0, 160) : '',
    enemyHealth: Array.isArray(record?.enemyHealth) ? record.enemyHealth.slice(0, 4).map(value => number(value, 100, 100)) : null, car: decodeCar(record?.car) };
}
export function readSlot() {
  try {
    const saved = JSON.parse(localStorage.getItem(SLOT));
    if (!hasPose(saved) || saved.version !== VERSION && saved.version !== 1 || typeof saved.seed !== 'string' || !saved.seed.length || saved.seed.length > 128) return null;
    const story = decodeStory(saved.version === VERSION ? saved.story : null, count(saved.mission, 0, MISSIONS.length));
    const x = coordinate(saved.x, 0), z = coordinate(saved.z, 0);
    return { version: VERSION, seed: saved.seed, x, z, heading: saved.heading, story, mission: story.index,
      cash: number(saved.cash, PLAYER.cash, 1e9), reputation: number(saved.reputation, reputation[story.index], 1e6), health: number(saved.health, 100, 100, 1), armour: number(saved.armour, 0, 100),
      seconds: number(saved.seconds, 0, 1e9), district: Object.hasOwn(DISTRICTS, saved.district) ? saved.district : 'palma',
      wanted: saved.wanted ? { heat: number(saved.wanted.heat, 0, 100), x: coordinate(saved.wanted.x, x), z: coordinate(saved.wanted.z, z) } : null,
      ammo: saved.ammo ? { current: count(saved.ammo.current, 12, 12), reserve: count(saved.ammo.reserve, 72, 144) } : null };
  } catch { return null; }
}
export function writeSlot(city, player, progress, pose = player.position, story = null, wanted = null, ammo = null) {
  try {
    const { x, z } = pose;
    localStorage.setItem(SLOT, JSON.stringify({ version: VERSION, seed: city.seed, x, z, heading: player.heading, health: player.health, armour: player.armour, cash: player.cash, reputation: player.reputation,
      mission: story?.index ?? progress.mission, story, completedMissions: story?.completed ?? [], district: city.districtAt(x, z), seconds: progress.seconds,
      wanted: wanted ? { x: wanted.x, z: wanted.z, heat: wanted.heat } : null, ammo: ammo ? { current: ammo.current, reserve: ammo.reserve } : null }));
    return true;
  } catch { return false; }
}
export function slotSummary(saved) {
  if (!saved) return 'No local save';
  const seconds = Math.floor(saved.seconds), time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  return `${DISTRICTS[saved.district].name} · $${saved.cash.toLocaleString('en-US')} · ${saved.mission}/${MISSIONS.length} jobs · ${time}`;
}
