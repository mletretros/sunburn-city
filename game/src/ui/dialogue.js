function drawPortrait(canvas, name) {
  const c = canvas.getContext('2d'), mars = name === 'Mars', inez = name === 'Inez';
  c.fillStyle = '#25424b'; c.fillRect(0, 0, 84, 98);
  c.fillStyle = mars ? '#eb6960' : inez ? '#45aa9d' : '#deb174';
  c.beginPath(); c.ellipse(42, 101, 35, 35, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#b97855'; c.fillRect(34, 61, 16, 17);
  c.beginPath(); c.ellipse(42, 40, 22, 30, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#302632'; c.beginPath(); c.arc(42, 29, 24, Math.PI, Math.PI * 2); c.lineTo(64, 32); c.lineTo(49, 19); c.lineTo(21, 36); c.fill();
  if (mars || inez) c.fillRect(17, 29, 8, 41);
  c.fillStyle = '#252735'; c.fillRect(29, 39, 7, 3); c.fillRect(48, 39, 7, 3);
  c.strokeStyle = '#653c36'; c.lineWidth = 2; c.beginPath(); c.moveTo(34, 57); c.lineTo(48, 58); c.stroke();
  if (!mars && !inez) { c.fillStyle = '#302632'; c.fillRect(29, 51, 25, 4); }
  if (inez) { c.strokeStyle = '#ffdc91'; c.strokeRect(25, 35, 16, 12); c.strokeRect(44, 35, 16, 12); }
  c.fillStyle = '#ffe0a3'; c.fillRect(20, 3, 43, 2);
}

export function createDialogue() {
  const root = document.createElement('section');
  root.id = 'dialogue-root'; root.hidden = true; root.setAttribute('aria-label', 'Story dialogue');
  root.innerHTML = '<canvas id="dialogue-portrait" width="84" height="98"></canvas><div class="dialogue-copy"><div class="micro" id="dialogue-label"></div><strong id="dialogue-name"></strong><p id="dialogue-text"></p><div class="buttons"><button id="dialogue-continue" class="primary">Continue ↗</button><button id="dialogue-skip">Skip / accept job</button></div></div>';
  document.body.append(root);
  const portrait = root.querySelector('canvas'), speaker = root.querySelector('#dialogue-name');
  const text = root.querySelector('#dialogue-text'), label = root.querySelector('#dialogue-label');
  let lines = [], index = 0, typed = 0, lastCount = -1, done = null;
  function renderLine() {
    typed = 0; lastCount = -1; speaker.textContent = lines[index].speaker;
    drawPortrait(portrait, lines[index].speaker); text.textContent = '';
  }
  function close(invoke = true) {
    root.hidden = true; const callback = done; done = null;
    if (invoke) callback?.();
  }
  function advance() {
    if (root.hidden) return;
    if (typed < lines[index].text.length) { typed = lines[index].text.length; text.textContent = lines[index].text; return; }
    if (++index >= lines.length) close(); else renderLine();
  }
  root.querySelector('#dialogue-continue').addEventListener('click', advance);
  root.querySelector('#dialogue-skip').addEventListener('click', () => close());
  window.addEventListener('keydown', event => {
    if (root.hidden || !['Enter', 'Space', 'KeyQ'].includes(event.code)) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (!event.repeat) { if (event.code === 'KeyQ') close(); else advance(); }
  }, true);
  return {
    get active() { return !root.hidden; }, advance, skip: () => close(), hide: () => close(false),
    show(nextLines, callback, title = 'Incoming call') {
      lines = nextLines || []; index = 0; done = callback; label.textContent = title;
      if (!lines.length) { close(); return; }
      root.hidden = false; renderLine();
    },
    update(dt) {
      if (root.hidden) return;
      typed = Math.min(lines[index].text.length, typed + dt * 48);
      const count = Math.floor(typed);
      if (count !== lastCount) { lastCount = count; text.textContent = lines[index].text.slice(0, count); }
    },
  };
}
