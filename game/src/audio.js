import { makeRng } from './rng.js';
// Long-lived music/engine nodes; disposable effects share a strict voice budget.
export function createAudio() {
  let context, output, music, noise, motor, motorLevel, tyres, siren, sirenLevel, bass, pad, lead;
  let muted = false, voices = 0, beat = 0, nextBeat = 0, duckUntil = 0;
  const roots = [55, 43.65, 65.41, 49], melody = [4, 6, 4.7568, 8, 6, 4.7568, 4, 3];
  function gain(parent, volume) {
    const node = context.createGain(); node.gain.value = volume; node.connect(parent); return node;
  }
  function oscillator(parent, type, frequency) {
    const node = context.createOscillator(); node.type = type; node.frequency.value = frequency; node.connect(parent); return node;
  }
  function hiss(parent, frequency, loop = true) {
    const filter = context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = frequency; filter.connect(parent);
    const source = context.createBufferSource(); source.buffer = noise; source.loop = loop; source.connect(filter); return { source, filter };
  }
  function unlock() {
    if (!context) {
      try { context = new AudioContext(); } catch { return; }
      output = gain(context.destination, muted ? 0 : .48); music = gain(output, .03);
      noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
      const data = noise.getChannelData(0), random = makeRng('sunburn-audio');
      for (let i = 0; i < data.length; i++) data[i] = random.range(-1, 1);
      motorLevel = gain(output, 0); motor = oscillator(motorLevel, 'triangle', 36);
      tyres = gain(output, 0); hiss(tyres, 1790).source.start();
      sirenLevel = gain(output, 0); siren = oscillator(sirenLevel, 'square', 430);
      bass = oscillator(music, 'triangle', 55); pad = oscillator(music, 'sine', 110);
      lead = oscillator(gain(music, .22), 'triangle', 220);
      motor.start(); siren.start(); bass.start(); pad.start(); lead.start();
      hiss(gain(output, .045), 170).source.start();
    }
    if (context.state !== 'running') void context.resume().catch(() => {});
  }
  const ready = () => context?.state === 'running' && !muted && voices < 32;
  const smooth = (parameter, value, now, rate = .08) => parameter.setTargetAtTime(value, now, rate);
  function play(source, envelope, filter, duration) {
    voices++;
    source.onended = () => { source.disconnect(); envelope.disconnect(); filter?.disconnect(); voices--; };
    source.start(); source.stop(context.currentTime + duration);
  }
  function tone(from, to, duration, volume, type = 'triangle') {
    if (!ready()) return;
    const now = context.currentTime, envelope = gain(output, .001), source = oscillator(envelope, type, from);
    envelope.gain.setValueAtTime(.001, now); envelope.gain.linearRampToValueAtTime(volume, now + .014);
    envelope.gain.exponentialRampToValueAtTime(.001, now + duration);
    source.frequency.exponentialRampToValueAtTime(to, now + duration); play(source, envelope, null, duration + .011);
  }
  function burst(frequency, duration, volume) {
    if (!ready()) return;
    const envelope = gain(output, volume), noiseVoice = hiss(envelope, frequency, false);
    envelope.gain.exponentialRampToValueAtTime(.001, context.currentTime + duration);
    play(noiseVoice.source, envelope, noiseVoice.filter, duration);
  }
  return {
    unlock,
    mute(value) { muted = !!value; if (output) smooth(output.gain, muted ? 0 : .48, context.currentTime); },
    update(car, playing = true) {
      if (context?.state !== 'running') return;
      const now = context.currentTime, speed = Math.abs(car?.speed ?? 0), gear = typeof car?.gear === 'number' ? car.gear : 1;
      smooth(motor.frequency, 35 + speed * 2.2 - (gear - 1) * 8 + (car?.throttle ? 9 : 0), now);
      smooth(motorLevel.gain, car ? .031 + speed * .0008 + (car.throttle ? .025 : 0) : 0, now);
      smooth(tyres.gain, (car?.skid ?? 0) * .19, now);
      smooth(music.gain, playing ? now < duckUntil ? .009 : .03 : .005, now);
      if (now < nextBeat) return;
      const root = roots[(beat >> 3) % roots.length];
      smooth(bass.frequency, root * (beat % 8 === 6 ? 1.5 : 1), now);
      smooth(pad.frequency, root * 2.005, now, .18); smooth(lead.frequency, root * melody[beat % 8], now, .014);
      beat = (beat + 1) % 32; nextBeat = now + .235;
    },
    door() { tone(110, 49, .13, .23); burst(680, .089, .12); },
    horn(volume = .34, pitch = 340) { tone(pitch, pitch * .98, .36, volume); tone(pitch * 1.25, pitch * 1.23, .35, volume * .57, 'square'); },
    footstep(sprint) { burst(sprint ? 760 : 580, .09, sprint ? .15 : .09); },
    gunshot(volume = .28) { if (context) duckUntil = context.currentTime + .48; burst(2600, .08, volume); tone(115, 72, .18, volume * .7, 'square'); },
    reload() { tone(720, 380, .09, .13, 'square'); tone(390, 220, .13, .12); },
    impact() { burst(510, .16, .18); },
    crash() { tone(98, 38, .42, .32, 'sawtooth'); burst(620, .32, .25); },
    explosion() { tone(90, 24, .75, .42, 'sawtooth'); burst(180, .48, .35); },
    wanted() { tone(430, 660, .22, .22, 'square'); tone(660, 880, .25, .16); },
    radio() { burst(1300, .16, .08); tone(685, 440, .11, .028); },
    siren(car, distance = 30) {
      if (!siren) return;
      const now = context.currentTime;
      smooth(siren.frequency, (Math.sin(now * 5.2) > 0 ? 640 : 430) + Math.max(0, 60 - distance), now, .055);
      smooth(sirenLevel.gain, !muted && car?.active ? Math.max(0, .12 - distance * .0022) : 0, now);
    },
  };
}
