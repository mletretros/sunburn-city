// A local synthesizer owns persistent motor and siren voices; no audio assets load.
export function createAudio() {
  let context, master, engine, motor, alarm, sirenGain, silent = false;
  function unlock() {
    if (!context) {
      context = new AudioContext(); master = context.createGain(); master.gain.value = .16; master.connect(context.destination);
      engine = context.createOscillator(); engine.type = 'sawtooth'; motor = context.createGain(); motor.gain.value = 0;
      engine.connect(motor).connect(master); engine.start();
      alarm = context.createOscillator(); sirenGain = context.createGain(); sirenGain.gain.value = 0;
      alarm.connect(sirenGain).connect(master); alarm.start();
    }
    context.resume().catch(() => {});
  }
  function chirp(hz, duration = .12, volume = .25, shape = 'triangle') {
    if (!context || silent) return;
    const tone = context.createOscillator(), gain = context.createGain(), now = context.currentTime;
    tone.type = shape; tone.frequency.setValueAtTime(hz, now); tone.frequency.exponentialRampToValueAtTime(Math.max(30, hz * .35), now + duration);
    gain.gain.setValueAtTime(volume, now); gain.gain.exponentialRampToValueAtTime(.001, now + duration);
    tone.connect(gain).connect(master); tone.start(now); tone.stop(now + duration);
    tone.onended = () => { tone.disconnect(); gain.disconnect(); };
  }
  const gunshot = (volume = .7) => chirp(130, .09, volume, 'sawtooth');
  return {
    unlock, gunshot, gun: gunshot, shot: gunshot,
    mute(value) { silent = value === undefined ? !silent : !!value; if (master) master.gain.value = silent ? 0 : .16; },
    update(car, running = true) {
      if (!context) return;
      motor.gain.setTargetAtTime(car && running ? .1 : 0, context.currentTime, .07);
      engine.frequency.setTargetAtTime(45 + Math.abs(car?.speed || 0) * 6, context.currentTime, .06);
    },
    siren(car, distance = 20) {
      if (!context) return;
      alarm.frequency.value = 650 + Math.sin(context.currentTime * 7) * 230;
      sirenGain.gain.value = car ? Math.max(0, .1 - distance / 1500) : 0;
    },
    reload() { chirp(690, .12, .1, 'square'); }, impact() { chirp(95, .08, .2, 'square'); }, radio() { chirp(1400, .08, .1); },
    crash() { chirp(65, .22, .7, 'square'); }, explosion() { chirp(55, .65, .9, 'sawtooth'); },
    door() { chirp(100, .07); }, horn(volume = .25, pitch = 310) { chirp(pitch, .45, volume); }, wanted() { chirp(880, .3); },
    footstep(sprint) { chirp(sprint ? 95 : 75, .025, .08); }, reward() { chirp(1200, .4); },
  };
}
