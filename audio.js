window.AurixAudio = (function () {
  let ctx = null;

  function ensureContext() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;

    if (!AudioContext) return null;

    if (!ctx) {
      ctx = new AudioContext();
    }

    if (ctx.state === "suspended") {
      ctx.resume();
    }

    return ctx;
  }

  function playIgnition() {
    const audio = ensureContext();
    if (!audio) return;

    const now = audio.currentTime;
    const master = audio.createGain();
    master.gain.value = 0.6;
    master.connect(audio.destination);

    function click(time, freq) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();

      osc.type = "square";
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(0.35, time + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.03);

      osc.connect(gain);
      gain.connect(master);

      osc.start(time);
      osc.stop(time + 0.05);
    }

    function tone(time, freq, dur, peak) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();

      osc.type = "sine";
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(peak || 0.3, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

      osc.connect(gain);
      gain.connect(master);

      osc.start(time);
      osc.stop(time + dur + 0.05);
    }

    click(now, 150);
    click(now + 0.08, 105);
    click(now + 0.16, 165);

    const crank = audio.createOscillator();
    const crankGain = audio.createGain();

    crank.type = "sawtooth";
    crank.frequency.setValueAtTime(55, now + 0.22);
    crank.frequency.exponentialRampToValueAtTime(165, now + 0.42);
    crank.frequency.exponentialRampToValueAtTime(90, now + 0.6);
    crank.frequency.exponentialRampToValueAtTime(240, now + 0.82);

    crankGain.gain.setValueAtTime(0.0001, now + 0.22);
    crankGain.gain.exponentialRampToValueAtTime(0.25, now + 0.35);
    crankGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

    crank.connect(crankGain);
    crankGain.connect(master);

    crank.start(now + 0.22);
    crank.stop(now + 0.95);

    const rise = audio.createOscillator();
    const riseGain = audio.createGain();

    rise.type = "triangle";
    rise.frequency.setValueAtTime(110, now + 0.9);
    rise.frequency.exponentialRampToValueAtTime(900, now + 1.45);

    riseGain.gain.setValueAtTime(0.0001, now + 0.9);
    riseGain.gain.exponentialRampToValueAtTime(0.32, now + 1.15);
    riseGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);

    rise.connect(riseGain);
    riseGain.connect(master);

    rise.start(now + 0.9);
    rise.stop(now + 1.55);

    tone(now + 1.52, 620, 0.12, 0.3);
    tone(now + 1.68, 880, 0.2, 0.32);
  }

  return {
    playIgnition: playIgnition
  };
})();
