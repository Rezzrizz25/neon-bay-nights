// WebAudio synth only — no audio files, no network. Engine hum, a radio-style
// synth music sequencer (three stations), sirens, and one-shot sound effects.
const STATIONS = [
  { name: 'NEON FM', bpm: 112, bass: [55, 0, 65.41, 0, 49, 0, 58.27, 0], lead: [220, 261.63, 329.63, 392, 329.63, 261.63, 220, 196] },
  { name: 'BAY 98', bpm: 92, bass: [41.2, 0, 49, 0, 55, 0, 49, 0], lead: [164.81, 196, 246.94, 220, 196, 164.81, 146.83, 130.81] },
  { name: 'PALM WAVE', bpm: 128, bass: [65.41, 65.41, 0, 49, 58.27, 0, 73.42, 0], lead: [523.25, 440, 392, 440, 523.25, 659.25, 587.33, 523.25] },
];

export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let musicGain = null;
  let muted = false;
  let station = 0;
  let radioOn = true;
  let step = 0;
  let nextNote = 0;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenLfo = null;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.16;
      musicGain.connect(master);
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 50;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const filt = ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = 600;
      engineOsc.connect(filt);
      filt.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      nextNote = ctx.currentTime + 0.1;
    } catch { return false; }
    return true;
  }

  function note(freq, when, dur, type, gain, dest) {
    if (!freq) return;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(gain, when + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    o.connect(g);
    g.connect(dest || musicGain);
    o.start(when);
    o.stop(when + dur + 0.05);
  }

  function musicTick() {
    if (!ctx || muted || !radioOn) return;
    const st = STATIONS[station];
    const spb = 60 / st.bpm / 2;
    while (nextNote < ctx.currentTime + 0.25) {
      const i = step % 8;
      note(st.bass[i], nextNote, spb * 1.8, 'triangle', 0.5);
      note(st.lead[i], nextNote, spb * 0.9, 'square', 0.12);
      if (step % 4 === 2) note(st.lead[i] * 2, nextNote + spb / 2, spb * 0.5, 'sine', 0.08);
      step += 1;
      nextNote += spb;
    }
  }

  function sfx(name) {
    if (!ensure() || muted || !ctx) return;
    const t = ctx.currentTime;
    if (name === 'shot') { note(900, t, 0.08, 'square', 0.5, master); note(180, t, 0.12, 'sawtooth', 0.4, master); }
    else if (name === 'punch') { note(120, t, 0.1, 'sine', 0.6, master); }
    else if (name === 'crash') { note(70, t, 0.3, 'sawtooth', 0.6, master); note(50, t, 0.25, 'square', 0.3, master); }
    else if (name === 'pickup') { note(660, t, 0.1, 'sine', 0.35, master); note(990, t + 0.09, 0.16, 'sine', 0.35, master); }
    else if (name === 'mission') { [523, 659, 784, 1046].forEach((f, i) => note(f, t + i * 0.1, 0.22, 'sine', 0.35, master)); }
    else if (name === 'enter') { note(300, t, 0.08, 'triangle', 0.3, master); note(420, t + 0.07, 0.1, 'triangle', 0.3, master); }
    else if (name === 'explode') { note(45, t, 0.7, 'sawtooth', 0.8, master); note(90, t, 0.4, 'square', 0.5, master); }
    else if (name === 'hurt') { note(200, t, 0.15, 'sawtooth', 0.4, master); }
  }

  function setSiren(on) {
    if (!ensure() || !ctx) return;
    if (on && !sirenOsc) {
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'sine';
      sirenOsc.frequency.value = 700;
      sirenLfo = ctx.createOscillator();
      sirenLfo.frequency.value = 0.7;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 250;
      sirenLfo.connect(lfoGain);
      lfoGain.connect(sirenOsc.frequency);
      sirenGain = ctx.createGain();
      sirenGain.gain.value = muted ? 0 : 0.05;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
      sirenLfo.start();
    } else if (!on && sirenOsc) {
      try { sirenOsc.stop(); sirenLfo.stop(); } catch { /* already stopped */ }
      sirenOsc = null; sirenLfo = null; sirenGain = null;
    }
  }

  return {
    unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
    update(dt, speedRatio, wanted) {
      if (!ctx) return;
      musicTick();
      if (engineGain) {
        engineGain.gain.value = muted ? 0 : 0.03 + speedRatio * 0.05;
        engineOsc.frequency.value = 45 + speedRatio * 140;
      }
      setSiren(wanted > 0);
      if (sirenGain) sirenGain.gain.value = muted ? 0 : 0.045;
    },
    sfx,
    toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.5; return muted; },
    isMuted() { return muted; },
    toggleRadio() {
      radioOn = !radioOn;
      if (!radioOn) { station = (station + 1) % STATIONS.length; radioOn = true; }
      return STATIONS[station].name;
    },
    stationName() { return STATIONS[station].name; },
    radioOn() { return radioOn; },
  };
}
