import { MISSIONS } from './story.js';
import { DISTRICTS } from '../config.js';
export const SLOT = 'sunburn-city.slot.v1';
export const VERSION = 2;
const finite = (value, fallback, max = 1e7) => Number.isFinite(value) ? Math.max(0, Math.min(max, value)) : fallback;
export function readSlot() {
  try {
    const raw = JSON.parse(localStorage.getItem(SLOT));
    if (!raw || ![1, 2].includes(raw.version) || typeof raw.seed !== 'string' || !raw.seed || raw.seed.length > 128) return null;
    if (![raw.x, raw.z, raw.heading].every(Number.isFinite) || Math.abs(raw.x) > 10000 || Math.abs(raw.z) > 10000) return null;
    const index = Math.floor(finite(raw.story?.index ?? raw.mission, 0, 8));
    const story = { ...raw.story, index, completed: MISSIONS.slice(0, index).map(job => job.id) };
    if (!['offered', 'active', 'failed', 'complete'].includes(story.state)) story.state = index === 8 ? 'complete' : 'offered';
    story.step = Math.floor(finite(story.step, 0, Math.max(0, (MISSIONS[index]?.objectives.length || 1) - 1)));
    let earnedRep = 0; for (let n = 0; n < index; n++) earnedRep += MISSIONS[n].rewards.reputation;
    return { ...raw, version: VERSION, story, mission: index, health: finite(raw.health, 100, 100), armour: finite(raw.armour, 0, 100), cash: Math.floor(finite(raw.cash, 240)), reputation: Math.max(earnedRep, finite(raw.reputation, 0)), seconds: finite(raw.seconds, 0), district: DISTRICTS[raw.district] ? raw.district : 'palma' };
  } catch { return null; }
}
export function writeSlot(city, player, progress, pose = player.position, story = null, wanted = null, ammo = null) {
  try {
    const record = {
      version: VERSION, seed: String(city.seed), x: pose.x, z: pose.z, heading: player.heading,
      health: player.health, armour: player.armour, cash: player.cash, reputation: player.reputation,
      mission: progress.mission, seconds: progress.seconds, completed: progress.completed,
      district: city.districtAt(pose.x, pose.z), story: story || { index: progress.mission, state: 'offered', step: 0 },
      wanted: wanted ? { heat: wanted.heat, x: wanted.x, z: wanted.z } : null,
      ammo: ammo ? { current: ammo.current, reserve: ammo.reserve } : null,
    };
    localStorage.setItem(SLOT, JSON.stringify(record)); return true;
  } catch { return false; }
}
export function slotSummary(saved) {
  return saved ? DISTRICTS[saved.district].name + ' / $' + saved.cash + ' / ' + saved.mission + ' of 8 jobs' : 'No local save yet';
}
