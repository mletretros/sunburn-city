import { slotSummary } from '../systems/save.js';
import { MISSIONS } from '../systems/story.js';

export function createMenus(actions, initialQuality) {
  const el = id => document.getElementById(id);
  const shell = el('menus'), start = el('start'), pause = el('pause'), settings = el('settings');
  const notice = el('menu-status'), slot = el('slot'), quality = el('quality'), sensitivity = el('sensitivity');
  const continueButton = el('continue'), load = el('load');
  const missionLog = el('mission-log'), jobList = el('job-list'), storyProgress = el('story-progress');
  el('jobs').addEventListener('click', () => { missionLog.hidden = !missionLog.hidden; actions.jobs(); });
  el('job-start').addEventListener('click', () => actions.startMission());
  const controls = el('controls-template');
  for (const node of document.querySelectorAll('[data-controls]')) node.append(controls.content.cloneNode(true));
  quality.value = initialQuality;
  quality.addEventListener('change', () => actions.quality(quality.value));
  el('audio-mute').addEventListener('change', event => actions.mute(event.currentTarget.checked));
  sensitivity.addEventListener('input', () => {
    actions.sensitivity(Number(sensitivity.value));
    el('sensitivity-value').value = `${Number(sensitivity.value).toFixed(1)}×`;
  });
  for (const [id, handler] of Object.entries({ new: 'newGame', continue: 'load', resume: 'resume', save: 'save', load: 'load', restart: 'restart' })) {
    el(id).addEventListener('click', () => actions[handler]());
  }
  return {
    show(mode, data) {
      shell.hidden = mode === 'play';
      start.hidden = mode !== 'start'; pause.hidden = mode !== 'pause';
      shell.dataset.mode = mode;
      if (mode !== 'play') {
        (mode === 'start' ? start : pause).append(settings, notice);
        this.slot(data); notice.textContent = '';
      }
    },
    missionLog(runtime, player) {
      storyProgress.textContent = `${runtime.index} / ${MISSIONS.length} jobs complete · ${Math.round(runtime.index / MISSIONS.length * 100)}% · ${player.reputation} REP`;
      jobList.replaceChildren();
      MISSIONS.forEach((mission, i) => {
        const row = document.createElement('li'), status = i < runtime.index ? 'COMPLETE' : i === runtime.index ? runtime.state.toUpperCase() : 'LOCKED';
        const title = document.createElement('strong'), brief = document.createElement('small');
        title.textContent = `${i + 1}. ${mission.name} · ${status}`;
        brief.textContent = `${mission.brief}  $${mission.rewards.cash} / +${mission.rewards.reputation} REP · ${i ? `Unlock: ${MISSIONS[i - 1].name}, ${mission.unlock.reputation} REP` : 'Available from the start'}`;
        row.append(title, brief); jobList.append(row);
      });
      const button = el('job-start'); button.disabled = runtime.index >= MISSIONS.length;
      button.textContent = runtime.state === 'active' ? 'Resume job' : runtime.state === 'failed' ? 'Retry job' : 'Take next job';
    },
    slot(data) { slot.textContent = slotSummary(data); load.disabled = continueButton.disabled = !data; },
    message(text) { notice.textContent = text; },
  };
}
