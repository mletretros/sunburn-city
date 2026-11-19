import { makeRng } from './rng.js';

export function createAudio() {
  let ctx, master, engine, engineGain, skidGain, noise, muted = false, musicGain, sirenVoice, sirenGain;
  let bass, pad, arp, arpGain, nextNote = 0, beat = 0, duckUntil = 0;
  const roots = [55, 43.65, 65.41, 49], melody = [4, 6, 4.7568, 8, 6, 4.7568, 4, 3];
  function unlock() {
    if (!ctx) {
      try { ctx = new AudioContext(); } catch { return; }
      master = ctx.createGain(); master.gain.value = muted ? 0 : .48; master.connect(ctx.destination);
      musicGain = ctx.createGain(); musicGain.gain.value = .045; musicGain.connect(master);
      engine = ctx.createOscillator(); engine.type = 'sawtooth'; engine.frequency.value = 36;
      const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 190;
      engineGain = ctx.createGain(); engineGain.gain.value = 0;
      engine.connect(filter).connect(engineGain).connect(master); engine.start();
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const samples = noise.getChannelData(0), rng = makeRng('sunburn-audio');
      for (let i = 0; i < samples.length; i++) samples[i] = rng.range(-1, 1);
      const scrape = ctx.createBufferSource(); scrape.buffer = noise; scrape.loop = true;
      const band = ctx.createBiquadFilter(); band.type = 'bandpass'; band.frequency.value = 1790;
      skidGain = ctx.createGain(); skidGain.gain.value = 0;
      scrape.connect(band).connect(skidGain).connect(master); scrape.start();
      sirenVoice = ctx.createOscillator(); sirenVoice.type = 'square'; sirenVoice.frequency.value = 430;
      sirenGain = ctx.createGain(); sirenGain.gain.value = 0; sirenVoice.connect(sirenGain).connect(master); sirenVoice.start();
      bass = ctx.createOscillator(); bass.type = 'triangle'; bass.frequency.value = 55; bass.connect(musicGain); bass.start();
      pad = ctx.createOscillator(); pad.type = 'sine'; pad.frequency.value = 110; pad.connect(musicGain); pad.start();
      arp = ctx.createOscillator(); arp.type = 'triangle'; arpGain = ctx.createGain(); arpGain.gain.value = .01;
      arp.connect(arpGain).connect(musicGain); arp.start();
      const city = ctx.createBufferSource(), cityFilter = ctx.createBiquadFilter(), cityGain = ctx.createGain();
      city.buffer = noise; city.loop = true; cityFilter.type = 'lowpass'; cityFilter.frequency.value = 170;
      cityGain.gain.value = .045; city.connect(cityFilter).connect(cityGain).connect(master); city.start();
    }
    if (ctx.state === 'suspended' || ctx.state === 'interrupted') ctx.resume().catch(() => {});
  }
  function tone(hz, end, duration, volume, type) {
    if (!ctx || ctx.state !== 'running' || muted) return;
    const t = ctx.currentTime, voice = ctx.createOscillator(), envelope = ctx.createGain();
    voice.type = type; voice.frequency.setValueAtTime(hz, t); voice.frequency.exponentialRampToValueAtTime(end, t + duration);
    envelope.gain.setValueAtTime(.001, t); envelope.gain.linearRampToValueAtTime(volume, t + .014);
    envelope.gain.exponentialRampToValueAtTime(.001, t + duration);
    voice.connect(envelope).connect(master); voice.start(); voice.stop(t + duration + .011);
  }
  function burst(freq, duration, volume) {
    if (!ctx || ctx.state !== 'running' || muted) return;
    const t = ctx.currentTime, voice = ctx.createBufferSource(), envelope = ctx.createGain();
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = freq;
    voice.buffer = noise; envelope.gain.setValueAtTime(volume, t); envelope.gain.exponentialRampToValueAtTime(.001, t + duration);
    voice.connect(filter).connect(envelope).connect(master); voice.start(); voice.stop(t + duration);
  }
  return {
    unlock,
    mute(value) { muted = value; if (master) master.gain.setTargetAtTime(muted ? 0 : .48, ctx.currentTime, .045); },
    update(car, playing = true) {
      if (!ctx || ctx.state !== 'running') return;
      const t = ctx.currentTime, speed = Math.abs(car?.speed ?? 0);
      const gear = typeof car?.gear === 'number' ? car.gear : 1;
      engine.frequency.setTargetAtTime(35 + speed * 2.2 - (gear - 1) * 8 + (car?.throttle ? 9 : 0), t, .095);
      engineGain.gain.setTargetAtTime(car ? .031 + speed * .0008 + (car.throttle ? .025 : 0) : 0, t, .10);
      skidGain.gain.setTargetAtTime((car?.skid ?? 0) * .19, t, .045);
      musicGain.gain.setTargetAtTime(playing ? (t < duckUntil ? .009 : .030) : .005, t, .09);
      if (t >= nextNote) {
        const root = roots[(beat >> 3) % roots.length], index = beat % melody.length;
        bass.frequency.setTargetAtTime(root * (index === 6 ? 1.5 : 1), t, .045);
        pad.frequency.setTargetAtTime(root * 2.005, t, .18);
        arp.frequency.setTargetAtTime(root * melody[index], t, .014);
        arpGain.gain.cancelScheduledValues(t); arpGain.gain.setTargetAtTime(.44, t, .014);
        arpGain.gain.setTargetAtTime(.018, t + .055, .053);
        nextNote = t + .235; beat = (beat + 1) % 32;
      }
    },
    door() { tone(110, 49, .13, .23, 'triangle'); burst(680, .089, .12); },
    horn(volume = .34, pitch = 340) { tone(pitch, pitch * .98, .36, volume, 'triangle'); tone(pitch * 1.25, pitch * 1.23, .35, volume * .57, 'square'); },
    footstep(sprint) { burst(sprint ? 760 : 580, .09, sprint ? .15 : .09); },
    gunshot(volume = .28) { if (ctx) duckUntil = ctx.currentTime + .48; burst(2600, .08, volume); tone(115, 72, .18, volume * .7, 'square'); },
    reload() { tone(720, 380, .09, .13, 'square'); tone(390, 220, .13, .12, 'triangle'); },
    impact() { burst(510, .16, .18); },
    crash() { tone(98, 38, .42, .32, 'sawtooth'); burst(620, .32, .25); },
    explosion() { tone(90, 24, .75, .42, 'sawtooth'); burst(180, .48, .35); },
    wanted() { tone(430, 660, .22, .22, 'square'); tone(660, 880, .25, .16, 'triangle'); },
    radio() { burst(1300, .16, .08); tone(685, 440, .11, .028, 'triangle'); },
    siren(car, distance = 30) {
      if (!sirenVoice || !ctx || muted) return;
      const volume = car?.active ? Math.max(0, .12 - distance * .0022) : 0;
      sirenVoice.frequency.setTargetAtTime((Math.sin(ctx.currentTime * 5.2) > 0 ? 640 : 430) + Math.max(0, 60 - distance), ctx.currentTime, .055);
      sirenGain.gain.setTargetAtTime(volume, ctx.currentTime, .08);
    },
  };
}
