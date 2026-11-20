import { slotSummary } from '../systems/save.js';
import { MISSIONS } from '../systems/story.js';
export function createMenus(actions, initialQuality) {
  const root = document.createElement('section'); root.id = 'menu-root';
  root.innerHTML = '<div id="menu-content"><div class="micro">SUNBURN COUNTY / FLORIDA / 1997</div><h1>SUNBURN<br><em>CITY.</em></h1><p id="menu-description">Every street has a price.<br>Mars Vega is about to change the rate.</p><div class="menu-buttons"><button id="new-game" class="primary">New Game ↗</button><button id="continue-game">Continue</button><button id="resume-game">Resume</button><button id="save-game">Save game</button><button id="jobs-game">Jobs / retry</button></div><div id="save-summary"></div><div id="menu-message"></div><div id="jobs-list" hidden></div><div class="settings"><label>QUALITY <select id="quality"><option>low</option><option>standard</option><option>high</option></select></label><label>LOOK <input id="sensitivity" type="range" min="1" max="6" value="2.5" step=".5"></label><label><input id="mute" type="checkbox"> MUTE</label></div><footer>WASD MOVE / E ENTER / SPACE DRIFT / M MAP<br><br>ONE CITY. EIGHT DELIVERIES. NO CLEAN GETAWAYS.</footer></div>';
  document.body.append(root);
  const el = id => root.querySelector('#' + id);
  el('new-game').onclick = () => actions.newGame(); el('continue-game').onclick = () => actions.load(); el('resume-game').onclick = () => actions.resume();
  el('save-game').onclick = () => actions.save(); el('jobs-game').onclick = () => { actions.jobs(); actions.startMission(); };
  el('quality').value = initialQuality; el('quality').onchange = e => actions.quality(e.target.value);
  el('sensitivity').oninput = e => actions.sensitivity(Number(e.target.value) / 1000); el('mute').onchange = e => actions.mute(e.target.checked);
  function slot(saved) { el('save-summary').textContent = slotSummary(saved); el('continue-game').disabled = !saved; }
  return { slot,
    show(mode, saved) { root.hidden = mode === 'play'; el('resume-game').hidden = mode === 'start'; el('save-game').hidden = mode === 'start'; el('jobs-game').hidden = mode === 'start'; slot(saved); },
    message(value) { el('menu-message').textContent = value; },
    missionLog(missions, player) { const list = el('jobs-list'); list.replaceChildren(); for (let n = 0; n < MISSIONS.length; n++) { const row = document.createElement('div'); row.textContent = (n < missions.index ? '✓ ' : n === missions.index ? '→ ' : '· ') + (n + 1) + '. ' + MISSIONS[n].name; list.append(row); } list.hidden = false; },
  };
}
