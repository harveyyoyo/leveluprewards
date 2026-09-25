// Plain-JS version of classroom-sounds.ts for projects that don't use TypeScript.
// Same API: configureSound, playSound, attachClickSounds, SOUND_STYLES.

var SOUND_STYLES = {
  Soft:   { wave: "sine",     pitch: 1,    dur: 1,   vol: 1   },
  Arcade: { wave: "square",   pitch: 1.3,  dur: 0.7, vol: 0.35 },
  Wood:   { wave: "triangle", pitch: 0.55, dur: 0.6, vol: 1.4 },
  Bubbly: { wave: "sine",     pitch: 1.9,  dur: 1.4, vol: 0.9 },
};

var audioCtx = null;
var lastTick = 0;
var masterVolume = 0.7;
var enabled = true;
var currentStyle = "Soft";

function configureSound(opts) {
  opts = opts || {};
  if (opts.enabled !== undefined) enabled = opts.enabled;
  if (opts.volume !== undefined) masterVolume = enabled ? opts.volume / 100 : 0;
  if (opts.style !== undefined) currentStyle = opts.style;
}

function tone(from, to, dur, vol, delay) {
  if (!enabled) return;
  delay = delay || 0;
  var st = SOUND_STYLES[currentStyle] || SOUND_STYLES.Soft;
  from *= st.pitch; to *= st.pitch; dur *= st.dur; vol *= st.vol;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    var t = audioCtx.currentTime + delay * st.dur;
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.type = st.wave;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), t + dur);
    gain.gain.setValueAtTime(vol * masterVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(t); osc.stop(t + dur);
  } catch (e) { /* audio not available — stay silent */ }
}

function playSound(kind) {
  if (!enabled) return;
  if (kind === "pop") tone(480, 760, 0.12, 0.08);
  else if (kind === "tick") {
    var now = performance.now();
    if (now - lastTick < 60) return;
    lastTick = now;
    tone(1100, 900, 0.05, 0.04);
  } else if (kind === "toggle") {
    tone(523, 523, 0.06, 0.06);
    tone(784, 784, 0.09, 0.06, 0.07);
  } else if (kind === "reset") {
    tone(700, 380, 0.16, 0.07);
  } else if (kind === "success") {
    tone(523, 523, 0.08, 0.06);
    tone(659, 659, 0.08, 0.06, 0.08);
    tone(784, 784, 0.12, 0.06, 0.16);
  } else if (kind === "error") {
    tone(220, 180, 0.18, 0.08);
  }
}

function attachClickSounds(on) {
  if (typeof document === "undefined") return;
  var handler = function (e) {
    if (!on || !enabled) return;
    var now = Date.now();
    if (now - lastTick < 40) return;
    lastTick = now;
    var el = e.target.closest("button,[role=button],a,input,select,label");
    if (!el) return tone(300, 180, 0.08, 0.05);
    var big = el.offsetWidth > 140;
    tone(big ? 520 : 680, big ? 320 : 900, 0.09, 0.07);
  };
  document.removeEventListener("pointerdown", handler, true);
  if (on) document.addEventListener("pointerdown", handler, true);
}
