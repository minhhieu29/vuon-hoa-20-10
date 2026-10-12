import { rand } from './math';

/**
 * Bản nhạc hộp tạo bằng Web Audio, không cần file nhạc.
 * 32 ô nhịp Đô trưởng (A · A' · B · A', khoảng 80 giây rồi lặp lại): giai điệu tiếng chuông ở trên,
 * hợp âm rải ở giữa, bè trầm đi xuống từng bậc ở dưới, thêm tiếng vang cho ấm.
 */

/** Hợp âm: nốt trầm và bốn nốt rải (MIDI). */
const CHORD: Record<string, readonly [number, readonly number[]]> = {
  C: [48, [60, 64, 67, 72]],
  'G/B': [47, [59, 62, 67, 71]],
  Am: [45, [57, 60, 64, 69]],
  'Em/G': [43, [55, 59, 64, 67]],
  F: [41, [57, 60, 65, 69]],
  'C/E': [40, [55, 60, 64, 67]],
  Dm7: [38, [57, 60, 62, 65]],
  G: [43, [55, 59, 62, 67]],
};

const PROGRESSION = `
  C G/B Am Em/G F C/E Dm7 G
  C G/B Am Em/G F G   C   C
  Am F  C  G    Am F  Dm7 G
  C G/B Am Em/G F G   C   C`.trim().split(/\s+/);

/**
 * Giai điệu, mỗi chuỗi là một ô nhịp 8 móc đơn. Số là bậc trong Đô trưởng (1 = C5),
 * ' lên một quãng tám, mỗi - kéo dài thêm một móc đơn, r là nghỉ.
 */
const MELODY = [
  /* A */ "3- 5- 1'---", '7- 6- 5---', '6- 5- 3---', '2- 3- 5---', '6-- 5 4- 6-', "1'-- 7 1'- 5-", '6- 4- 3- 2-', '5- 4- 2---',
  /* A' */ "3- 5- 1'-- 2'", "2'--- 7- 5-", "1'-- 7 6---", '5- 6 5 3---', "6- 1'- 2'- 1'-", "5- 2'- 7---", "1'-------", 'r--- 3- 5-',
  /* B */ "6- 1'- 3'---", "2'- 1'- 6---", "5-- 3 5- 1'-", "2'--- 7---", "1'- 3'- 2'- 1'-", "1'--- 6---", "4- 6- 1'- 2'-", '7--- 5- 4-',
  /* A' */ "3- 5- 1'-- 2'", "2'--- 7- 5-", "1'-- 7 6---", '5- 6 5 3---', "6- 1'- 2'- 1'-", "5- 2'- 7---", "1'-------", 'r-------',
];

const DEGREE = [0, 2, 4, 5, 7, 9, 11];

/** Trải giai điệu ra từng móc đơn: [nốt, độ dài tính bằng móc đơn] hoặc null. */
function score(bars: string[]): ([number, number] | null)[] {
  const out: ([number, number] | null)[] = [];
  for (const bar of bars) for (const tok of bar.split(' ')) {
    const len = 1 + (tok.match(/-/g)?.length ?? 0);
    out.push(tok[0] === 'r' ? null : [72 + DEGREE[Number(tok[0]) - 1] + 12 * (tok.match(/'/g)?.length ?? 0), len]);
    for (let i = 1; i < len; i++) out.push(null);
  }
  return out;
}

type Voice = 'bell' | 'soft' | 'bass';

function createSound() {
  let ac: AudioContext | null = null;
  let master: GainNode | null = null;
  let started = false, step = 0, nextT = 0, timer = 0, bare = false;
  const noteCbs = new Set<(m: number) => void>();
  const STEP = 0.32;
  const PAT = [0, 1, 2, 3, 2, 1, 3, 2];
  const TUNE = score(MELODY);
  const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

  /** Tiếng vang: nhiễu trắng tắt dần, hai kênh khác nhau cho rộng. */
  function impulse(ctx: AudioContext, sec: number): AudioBuffer {
    const n = Math.floor(ctx.sampleRate * sec), buf = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
    }
    return buf;
  }

  function init(): boolean {
    if (ac) return true;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return false;
    try { ac = new AC(); } catch { return false; }
    master = ac.createGain(); master.gain.value = 0;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200;
    const rv = ac.createConvolver(); rv.buffer = impulse(ac, 2.6);
    const wet = ac.createGain(); wet.gain.value = 0.32;
    master.connect(lp); lp.connect(ac.destination); lp.connect(rv); rv.connect(wet); wet.connect(ac.destination);
    return true;
  }

  /** Một bè sóng sin/tam giác nối vào nốt; fade > 0 thì bè đó tắt sớm hơn cả nốt. */
  function partial(out: AudioNode, t: number, end: number, f: number, type: OscillatorType, level: number, fade = 0) {
    if (!ac) return;
    const o = ac.createOscillator(), k = ac.createGain();
    o.type = type; o.frequency.value = f;
    if (fade) { k.gain.setValueAtTime(level, t); k.gain.exponentialRampToValueAtTime(0.0001, t + fade); } else k.gain.value = level;
    o.connect(k); k.connect(out);
    o.start(t); o.stop(end);
  }

  function note(m: number, t: number, vel: number, dur: number, voice: Voice = 'soft') {
    if (!ac || !master) return;
    const f = mtof(m), g = ac.createGain(), end = t + dur + 0.05;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel, t + (voice === 'bass' ? 0.02 : 0.006));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(master);
    partial(g, t, end, f, 'sine', 1);
    if (voice === 'bell') { partial(g, t, end, f * 2, 'sine', 0.1); partial(g, t, end, f * 3, 'sine', 0.22, 0.25); }
    else if (voice === 'bass') partial(g, t, end, f * 2, 'sine', 0.3);
    else partial(g, t, end, f * 2, 'triangle', 0.12);
  }

  function tick() {
    if (!ac) return;
    if (nextT < ac.currentTime - 0.1) nextT = ac.currentTime + 0.05;
    while (nextT < ac.currentTime + 0.15) {
      const s = step % TUNE.length, i = s % 8, [bass, arp] = CHORD[PROGRESSION[s >> 3]];
      /* lúc đọc thư chỉ còn giai điệu, và giai điệu cũng nhỏ lại */
      if (!bare) {
        if (i === 0) note(bass, nextT, 0.07, 2.6, 'bass');
        note(arp[PAT[i]], nextT, (i === 0 ? 0.055 : 0.045) * rand(0.85, 1.15), 1.4);
      }
      const mel = TUNE[s];
      if (mel) {
        note(mel[0], nextT, (bare ? 0.08 : 0.12) * rand(0.9, 1.1), 1.2 + mel[1] * STEP * (bare ? 1 : 0.6), 'bell');
        /* báo cho khu vườn đúng lúc nốt vang lên, để hoa nở theo giai điệu */
        const m = mel[0];
        if (noteCbs.size) window.setTimeout(() => noteCbs.forEach(cb => cb(m)), Math.max(0, (nextT - ac.currentTime) * 1000));
      }
      nextT += STEP; step++;
    }
  }

  const ok = () => ac && started;
  const now = () => (ac ? ac.currentTime : 0);
  return {
    /** Bắt đầu (hoặc bật lại) nhạc. Phải gọi trong lúc người dùng bấm, trình duyệt mới cho phát tiếng. */
    start() {
      if (!init() || !ac || !master || started) return;
      started = true;
      void ac.resume();
      nextT = ac.currentTime + 0.06;
      timer = window.setInterval(tick, 30);
      master.gain.cancelScheduledValues(ac.currentTime);
      master.gain.setTargetAtTime(0.9, ac.currentTime, 0.5);
    },
    /** Mở quà trong im lặng: tắt hẳn nhạc và mọi tiếng chạm. */
    stop() {
      started = false;
      clearInterval(timer); timer = 0;
      if (ac && master) { master.gain.cancelScheduledValues(ac.currentTime); master.gain.setTargetAtTime(0, ac.currentTime, 0.15); }
    },
    /** Lúc đọc thư: bớt bè đệm, chỉ còn giai điệu nhẹ. */
    focus(v: boolean) { bare = v; },
    get playing() { return started; },
    /** Nghe từng nốt giai điệu (để hoa nở theo nhạc); trả về hàm huỷ. */
    onNote(cb: (m: number) => void) { noteCbs.add(cb); return () => { noteCbs.delete(cb); }; },
    pluck(m: number) { if (ok()) note(m, now() + 0.01, 0.13, 1.6, 'bell'); },
    chime() { if (ok()) [72, 76, 79, 84, 88].forEach((m, i) => note(m, now() + 0.02 + i * 0.07, 0.09, 1.5, 'bell')); },
    sparkle() { if (ok()) [88, 91, 96].forEach((m, i) => note(m, now() + 0.01 + i * 0.06, 0.05, 1.1, 'bell')); },
    swish() { if (ok()) [79, 83, 86, 91].forEach((m, i) => note(m, now() + 0.01 + i * 0.045, 0.045, 0.9)); },
    suspend() { if (ac && ac.state === 'running') void ac.suspend(); },
    resume() { if (ac && started) void ac.resume(); },
  };
}

export const Sound = createSound();
export const SCALE = [72, 74, 76, 79, 81, 84, 86, 88, 91];
