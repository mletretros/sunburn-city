function portrait(canvas, name) {
  const pen = canvas.getContext('2d'), mars = name === 'Mars', inez = name === 'Inez';
  const rect = (color, x, y, w, h) => { pen.fillStyle = color; pen.fillRect(x, y, w, h); };
  function oval(color, x, y, rx, ry) { pen.fillStyle = color; pen.beginPath(); pen.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); pen.fill(); }
  rect('#25424b', 0, 0, 84, 98); oval(mars ? '#eb6960' : inez ? '#45aa9d' : '#deb174', 42, 101, 35, 35);
  rect('#b97855', 34, 61, 16, 17); oval('#b97855', 42, 40, 22, 30);
  pen.fillStyle = '#302632'; pen.beginPath(); pen.arc(42, 29, 24, Math.PI, Math.PI * 2); pen.lineTo(64, 32); pen.lineTo(49, 19); pen.lineTo(21, 36); pen.fill();
  if (mars || inez) rect('#302632', 17, 29, 8, 41);
  rect('#252735', 29, 39, 7, 3); rect('#252735', 48, 39, 7, 3); pen.strokeStyle = '#653c36'; pen.lineWidth = 2; pen.beginPath(); pen.moveTo(34, 57); pen.lineTo(48, 58); pen.stroke();
  if (!mars && !inez) rect('#302632', 29, 51, 25, 4);
  if (inez) { pen.strokeStyle = '#ffdc91'; pen.strokeRect(25, 35, 16, 12); pen.strokeRect(44, 35, 16, 12); }
  rect('#ffe0a3', 20, 3, 43, 2);
}
export function createDialogue() {
  const panel = document.createElement('section'); panel.id = 'dialogue-root'; panel.hidden = true; panel.setAttribute('aria-label', 'Story dialogue');
  panel.innerHTML = `<canvas id="dialogue-portrait" width="84" height="98"></canvas>
    <div class="dialogue-copy"><div class="micro" id="dialogue-label"></div><strong id="dialogue-name"></strong>
    <p id="dialogue-text"></p><div class="buttons"><button id="dialogue-continue" class="primary">Continue ↗</button>
    <button id="dialogue-skip">Skip / accept job</button></div></div>`;
  document.body.append(panel);
  const art = panel.querySelector('canvas'), name = panel.querySelector('#dialogue-name'), title = panel.querySelector('#dialogue-label'), text = panel.querySelector('#dialogue-text');
  let callback = null, lines = [], cursor = 0, time = 0, shown = 0;
  function paintLine() { time = shown = 0; name.textContent = lines[cursor].speaker; text.textContent = ''; portrait(art, lines[cursor].speaker); }
  function finish(accept) { panel.hidden = true; const notify = callback; callback = null; if (accept) notify?.(); }
  function advance() {
    if (panel.hidden) return;
    const full = lines[cursor].text;
    if (shown < full.length) { time = shown = full.length; text.textContent = full; }
    else if (++cursor < lines.length) paintLine(); else finish(true);
  }
  panel.querySelector('#dialogue-continue').addEventListener('click', advance);
  panel.querySelector('#dialogue-skip').addEventListener('click', () => finish(true));
  window.addEventListener('keydown', event => {
    if (panel.hidden || !['Enter', 'Space', 'KeyQ'].includes(event.code)) return;
    event.preventDefault(); event.stopImmediatePropagation(); if (event.repeat) return;
    if (event.code === 'KeyQ') finish(true); else advance();
  }, true);
  return {
    get active() { return !panel.hidden; }, advance, skip() { finish(true); }, hide() { finish(false); },
    show(next, onDone, label = 'Incoming call') { lines = next ?? []; callback = onDone; cursor = 0; title.textContent = label; if (!lines.length) finish(true); else { panel.hidden = false; paintLine(); } },
    update(dt) { if (panel.hidden) return; const full = lines[cursor].text; time = Math.min(full.length, time + dt * 48); const count = Math.floor(time); if (count !== shown) { shown = count; text.textContent = full.slice(0, count); } },
  };
}
