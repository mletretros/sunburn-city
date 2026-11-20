import { MISSIONS } from '../systems/story.js';
import { slotSummary } from '../systems/save.js';
const byId = id => document.getElementById(id);
export function createMenus(actions, initialQuality) {
  const root = byId('menus'), start = byId('start'), pause = byId('pause'), settings = byId('settings'), status = byId('menu-status');
  const journal = byId('mission-log'), list = byId('job-list'), next = byId('job-start'), progress = byId('story-progress'), saveInfo = byId('slot');
  const quality = byId('quality'), sensitivity = byId('sensitivity');
  for (const [id, command] of [['new', 'newGame'], ['continue', 'load'], ['resume', 'resume'], ['save', 'save'], ['load', 'load'], ['restart', 'restart'], ['job-start', 'startMission']]) byId(id).addEventListener('click', () => actions[command]());
  for (const target of document.querySelectorAll('[data-controls]')) target.append(byId('controls-template').content.cloneNode(true));
  byId('jobs').addEventListener('click', () => { journal.hidden = !journal.hidden; actions.jobs(); });
  quality.value = initialQuality; quality.addEventListener('change', () => actions.quality(quality.value));
  byId('audio-mute').addEventListener('change', event => actions.mute(event.currentTarget.checked));
  sensitivity.addEventListener('input', () => { const value = Number(sensitivity.value); byId('sensitivity-value').value = `${value.toFixed(1)}×`; actions.sensitivity(value); });
  function slot(saved) { saveInfo.textContent = slotSummary(saved); byId('continue').disabled = byId('load').disabled = !saved; }
  return {
    slot,
    show(mode, saved) {
      root.dataset.mode = mode; root.hidden = mode === 'play'; start.hidden = mode !== 'start'; pause.hidden = mode !== 'pause'; if (root.hidden) return;
      if (mode === 'start') journal.hidden = true;
      (mode === 'start' ? start : pause).append(settings, status); status.replaceChildren(); slot(saved);
    },
    missionLog({ index, state }, { reputation }) {
      progress.textContent = `${index} / ${MISSIONS.length} jobs complete · ${Math.round(100 * index / MISSIONS.length)}% · ${reputation} REP`;
      list.replaceChildren(...MISSIONS.map((job, number) => {
        const row = document.createElement('li'), heading = document.createElement('strong'), details = document.createElement('small');
        const label = number < index ? 'COMPLETE' : number > index ? 'LOCKED' : state.toUpperCase(), before = MISSIONS[number - 1];
        heading.textContent = `${number + 1}. ${job.name} · ${label}`;
        details.textContent = `${job.brief}  $${job.rewards.cash} / +${job.rewards.reputation} REP · ${before ? `Unlock: ${before.name}, ${job.unlock.reputation} REP` : 'Available from the start'}`;
        row.append(heading, details); return row;
      }));
      next.disabled = index >= MISSIONS.length; next.textContent = state === 'active' ? 'Resume job' : state === 'failed' ? 'Retry job' : 'Take next job';
    },
    message(text) { status.textContent = text; },
  };
}
