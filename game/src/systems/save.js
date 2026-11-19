import { DISTRICTS } from '../config.js';
import { MISSIONS } from './story.js';

// Keep the storage key so phase-three slots migrate rather than disappearing.
export const SLOT = 'sunburn-city.slot.v1';
export const VERSION = 2;
const finite = (value, fallback, low, high) => Number.isFinite(value) ? Math.max(low, Math.min(high, value)) : fallback;

export function readSlot() {
  try {
    const data = JSON.parse(localStorage.getItem(SLOT));
    if (!data || ![1, VERSION].includes(data.version) || typeof data.seed !== 'string' || !data.seed || data.seed.length > 128 ||
      !['x', 'z', 'heading'].every(key => Number.isFinite(data[key]))) return null;
    const mission = Math.floor(finite(data.mission, 0, 0, MISSIONS.length));
    const story = data.version === VERSION && data.story && typeof data.story === 'object' ? data.story : {};
    const index = Math.floor(finite(story.index, mission, 0, MISSIONS.length));
    const step = Math.floor(finite(story.step, 0, 0, 10));
    return { ...data, version: VERSION, mission: index,
      cash: finite(data.cash, 240, 0, 1e9), reputation: finite(data.reputation, MISSIONS.slice(0, index).reduce((sum, m) => sum + m.rewards.reputation, 0), 0, 1e6),
      health: finite(data.health, 100, 1, 100), armour: finite(data.armour, 0, 0, 100), seconds: finite(data.seconds, 0, 0, 1e9),
      district: Object.hasOwn(DISTRICTS, data.district) ? data.district : 'palma',
      story: { index, step, state: ['active', 'failed', 'offered', 'complete'].includes(story.state) ? story.state : 'offered',
        remaining: finite(story.remaining, MISSIONS[index]?.objectives[step]?.time || 0, 0, 600), survived: finite(story.survived, 0, 0, 60),
        enemyHealth: Array.isArray(story.enemyHealth) ? story.enemyHealth.slice(0, 4).map(n => finite(n, 100, 0, 100)) : null,
        car: story.car && ['x', 'z', 'heading', 'health'].every(key => Number.isFinite(story.car[key])) ? story.car : null },
    };
  } catch { return null; }
}

export function writeSlot(city, player, progress, position = player.position, story = null, wanted = null, ammo = null) {
  try {
    localStorage.setItem(SLOT, JSON.stringify({ version: VERSION, seed: city.seed,
      x: position.x, z: position.z, heading: player.heading, health: player.health, armour: player.armour,
      cash: player.cash, reputation: player.reputation, mission: story?.index ?? progress.mission,
      completedMissions: story?.completed || [], story, seconds: progress.seconds,
      district: city.districtAt(position.x, position.z),
      wanted: wanted ? { heat: wanted.heat, x: wanted.x, z: wanted.z } : null,
      ammo: ammo ? { current: ammo.current, reserve: ammo.reserve } : null,
    }));
    return true;
  } catch { return false; }
}

export function slotSummary(slot) {
  if (!slot) return 'No local save';
  const minutes = Math.floor(slot.seconds / 60);
  return `${DISTRICTS[slot.district].name} · $${slot.cash.toLocaleString('en-US')} · ${slot.mission}/${MISSIONS.length} jobs · ${minutes}:${String(Math.floor(slot.seconds % 60)).padStart(2, '0')}`;
}
