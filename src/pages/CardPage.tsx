import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { COPY, LETTER } from '../config';
import { FLOWER } from '../bouquet';
import { confetti } from '../fx/confetti';
import { MiniGarden } from '../garden/mini';
import { coarse, reduceMotion } from '../lib/env';
import { Sound } from '../lib/sound';
import { Page } from '../components/Page';
import { useProgress } from '../state/progress';

/** 0 phong thư đóng · 1 con dấu bật · 2 nắp mở · 3 lá thư trồi lên · 4 phong thư lùi xuống · 5 tấm thiệp */
type Stage = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * Nhịp "viết tay" của lá thư (giây): lời mở thư hiện như nét bút kéo ngang, thân thư hiện từng chữ,
 * nghỉ một nhịp giữa các đoạn, cuối cùng là chữ ký. Thư là bước cuối: đọc xong là hết, không có nút nào phía dưới.
 */
const SCRIPT = (() => {
  const WORD = 0.055, PARA = 0.35;
  let t = 0.35 + 1.1;
  const paras = [LETTER.note, ...LETTER.paragraphs].filter(Boolean).map((text, i) => {
    const words = text.split(' ').map(w => { const d = t; t += WORD; return { w, d }; });
    t += PARA;
    return { note: i === 0 && Boolean(LETTER.note), words };
  });
  const sign = t;
  return { paras, sign, end: sign + 0.9 };
})();
const delay = (d: number) => ({ '--d': `${d.toFixed(2)}s` }) as CSSProperties;

export default function CardPage() {
  const { state, dispatch } = useProgress();
  const [stage, setStage] = useState<Stage>(state.letterOpen ? 5 : 0);
  /* đã đọc từ lần trước thì hiện đủ ngay, không bắt chờ viết lại */
  const [written, setWritten] = useState(state.letterOpen || reduceMotion);
  const timers = useRef<number[]>([]);
  const artRef = useRef<HTMLCanvasElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const stageRef = useRef(stage);
  useEffect(() => { stageRef.current = stage; }, [stage]);

  /* rời trang giữa chừng thì coi như đã mở thư */
  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
    if (stageRef.current > 0 && stageRef.current < 5) dispatch({ type: 'openLetter' });
  }, [dispatch]);

  /* lúc đọc thư: vườn phía sau tối lại, nhạc chỉ còn giai điệu */
  useEffect(() => {
    if (stage !== 5) return;
    document.documentElement.classList.add('reading');
    Sound.focus(true);
    return () => { document.documentElement.classList.remove('reading'); Sound.focus(false); };
  }, [stage]);

  useEffect(() => {
    if (stage !== 5 || written) return;
    const id = window.setTimeout(() => setWritten(true), SCRIPT.end * 1000);
    return () => clearTimeout(id);
  }, [stage, written]);

  const finish = () => {
    timers.current.forEach(clearTimeout); timers.current = [];
    setStage(5);
    dispatch({ type: 'openLetter' });
    confetti.rain(); Sound.chime();
    setTimeout(() => cardRef.current?.focus({ preventScroll: true }), 60);
  };
  const openLetter = () => {
    if (stage) return;
    if (reduceMotion) { finish(); return; }
    Sound.sparkle();
    setStage(1);
    const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
    at(260, () => setStage(2));
    at(820, () => { setStage(3); Sound.pluck(79); });
    at(1520, () => setStage(4));
    at(2000, finish);
  };

  /* vườn nhỏ trên thiệp mọc đúng các loài trong bó hoa người xem đã gói */
  const kindsKey = state.wrapped ? state.bouquet.map(it => it.k).join(',') : '';
  useEffect(() => {
    const cv = artRef.current;
    if (stage !== 5 || !cv) return;
    const kinds = kindsKey ? kindsKey.split(',').map(k => FLOWER[k as keyof typeof FLOWER].mini) : null;
    const m = new MiniGarden(cv, kinds);
    return () => m.destroy();
  }, [stage, kindsKey]);

  const s = (n: number) => (stage >= n ? ` s${n}` : '');
  return (
    <Page id="thiep" labelledBy="h-thiep" className="section">
      <div className="wrap card-wrap">
        <div className="end-head" data-reveal>
          <p className="kicker">Lá thư cuối</p>
          <h2 id="h-thiep" className="h" tabIndex={-1} data-h>Vài dòng gửi {COPY.addr}</h2>
        </div>
        <div className={`letter-stage${s(1)}${s(2)}${s(3)}${s(4)}`}>
          {stage < 5 && (
            <>
              <div className="env-wrap" data-reveal>
                <button className="envelope" type="button" aria-label="Mở phong thư" onClick={openLetter}>
                  <span className="env-back" />
                  <span className="env-paper"><span>{LETTER.greeting.replace(/,$/, '')}</span><span className="env-lines" /></span>
                  <span className="env-front" />
                  <span className="env-flap" />
                  <span className="env-seal">
                    <svg viewBox="-32 -32 64 64" aria-hidden="true"><g fill="currentColor">{[0, 72, 144, 216, 288].map(a => <circle key={a} cy="-15" r="11" transform={`rotate(${a})`} />)}</g><circle r="8" fill="#FFD36E" /></svg>
                  </span>
                </button>
              </div>
              <p className="env-hint" data-reveal>{coarse ? 'Chạm' : 'Bấm'} vào phong thư để mở</p>
            </>
          )}
          {stage === 5 && (
            <article ref={cardRef} className={`postcard${written ? ' written' : ''}`} tabIndex={-1} aria-label="Thiệp 20/10" onClick={() => setWritten(true)}>
              <div className="card-art"><canvas ref={artRef} aria-hidden="true" /><span className="stamp" aria-hidden="true">20.10<br />2026</span></div>
              <div className="card-body">
                <p className="to ink" style={delay(0.35)}>{LETTER.greeting}</p>
                {SCRIPT.paras.map((p, i) => (
                  <p key={i} className={p.note ? 'own' : undefined}>
                    {p.words.map(({ w, d }, j) => <span key={j} className="w" style={delay(d)}>{w} </span>)}
                  </p>
                ))}
                <p className="from ink" style={delay(SCRIPT.sign)}>{LETTER.signature}</p>
              </div>
            </article>
          )}
        </div>
        {stage === 5 && !written && <p className="env-hint">{coarse ? 'Chạm' : 'Bấm'} vào thư để hiện hết</p>}
      </div>
    </Page>
  );
}
