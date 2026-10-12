import { LETTER } from '../config';
import { TAU, rand } from '../lib/math';
import { C, NIGHT, WHITE } from '../garden/palette';
import { glow } from '../garden/sprites';

function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath(); g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
function wrapText(g: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = []; let line = '';
  for (const w of text.split(/\s+/)) {
    const test = line ? `${line} ${w}` : w;
    if (line && g.measureText(test).width > maxW) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/** Vẽ tấm thiệp thành ảnh dọc 1080×1920 (9:16, vừa story và hình nền điện thoại); thư dài thì ảnh cao thêm. */
export function renderCardImage(art: HTMLCanvasElement | null): HTMLCanvasElement {
  const W = 1080, PAD = 90, CW = W - PAD * 2, ART = 430, BP = 72, LH = 58, PG = 22, GLH = 84;
  const fBody = '400 35px "Be Vietnam Pro", system-ui, sans-serif';
  const fOwn = '700 40px "Charm", "Be Vietnam Pro", cursive';
  const fGreet = '700 66px "Charm", cursive';
  const tmp = document.createElement('canvas').getContext('2d');
  if (!tmp) throw new Error('Canvas 2D không khả dụng');
  tmp.font = fGreet;
  const greet = wrapText(tmp, LETTER.greeting, CW - BP * 2);
  const texts = [LETTER.note, ...LETTER.paragraphs].filter(Boolean);
  const paras = texts.map((p, i) => { tmp.font = i === 0 && LETTER.note ? fOwn : fBody; return wrapText(tmp, p, CW - BP * 2); });
  const bodyH = paras.reduce((s, ls) => s + ls.length * LH, 0) + (paras.length - 1) * PG;
  const CH = ART + BP + greet.length * GLH + 24 + bodyH + 18 + 80 + BP;
  const H = Math.max(1920, CH + PAD * 2 + 60);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  if (!g) throw new Error('Canvas 2D không khả dụng');
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#1A1038'); bg.addColorStop(1, NIGHT);
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'lighter';
  g.globalAlpha = 0.5; g.drawImage(glow(C.pink), -300, H - 640, W + 600, 900);
  g.globalAlpha = 0.25; g.drawImage(glow(C.lilac), -420, -520, W, 1000);
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 90; i++) { g.globalAlpha = rand(0.2, 0.7); g.fillStyle = Math.random() < 0.3 ? C.lilac : WHITE; g.beginPath(); g.arc(rand(0, W), rand(0, H), rand(0.6, 2), 0, TAU); g.fill(); }
  g.globalAlpha = 1;
  const x = PAD, y = (H - 60 - CH) / 2;
  g.save();
  g.translate(W / 2, y + CH / 2); g.rotate(-0.014); g.translate(-W / 2, -(y + CH / 2));
  g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 80; g.shadowOffsetY = 36;
  rr(g, x, y, CW, CH, 46); g.fillStyle = '#FFF8F1'; g.fill();
  g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0;
  g.save(); rr(g, x, y, CW, CH, 46); g.clip();
  /* quầng hồng chỉ trong phần tranh, không tràn xuống giấy */
  g.save(); g.beginPath(); g.rect(x, y, CW, ART); g.clip();
  const ag = g.createLinearGradient(0, y, 0, y + ART); ag.addColorStop(0, '#150D33'); ag.addColorStop(1, '#2A1240');
  g.fillStyle = ag; g.fillRect(x, y, CW, ART);
  g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.6;
  g.drawImage(glow(C.pink), x - CW * 0.2, y + ART * 0.45, CW * 1.4, ART * 1.3);
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  if (art && art.width > 1 && art.height > 1) {
    const sw = art.width, sh = art.height, da = CW / ART;
    let sx = 0, sy = 0, sW = sw, sH = sh;
    if (sw / sh > da) { sW = sh * da; sx = (sw - sW) / 2; } else { sH = sw / da; sy = sh - sH; }
    g.drawImage(art, sx, sy, sW, sH, x, y, CW, ART);
  }
  g.restore();
  /* mép giấy gợn như xé tay, giống trên trang */
  const pts = Array.from({ length: 15 }, (_, i) => [x + (CW * i) / 14, y + ART - 9 + Math.sin(i * 1.9) * 5]);
  g.beginPath(); g.moveTo(x, y + ART + 1); g.lineTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) { const [px, py] = pts[i - 1], [qx, qy] = pts[i]; g.quadraticCurveTo(px, py, (px + qx) / 2, (py + qy) / 2); }
  g.lineTo(x + CW, pts[14][1]); g.lineTo(x + CW, y + ART + 1); g.closePath();
  g.fillStyle = '#FFF8F1'; g.fill();
  g.restore();
  g.save(); g.translate(x + CW - 96, y + 96); g.rotate(0.14);
  g.setLineDash([10, 8]); g.lineWidth = 4; g.strokeStyle = 'rgba(255,246,251,.75)';
  g.beginPath(); g.arc(0, 0, 64, 0, TAU); g.stroke();
  g.fillStyle = '#FFF6FB'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '700 26px "Be Vietnam Pro", sans-serif'; g.fillText('20.10', 0, -14); g.fillText('2026', 0, 18);
  g.restore();
  g.textBaseline = 'top'; g.textAlign = 'left';
  let ty = y + ART + BP;
  g.fillStyle = '#C9346F'; g.font = fGreet;
  for (const l of greet) { g.fillText(l, x + BP, ty); ty += GLH; }
  ty += 24;
  paras.forEach((ls, i) => {
    const own = i === 0 && Boolean(LETTER.note);
    g.fillStyle = own ? '#C9346F' : '#2A1B3D'; g.font = own ? fOwn : fBody;
    for (const l of ls) { g.fillText(l, x + BP, ty); ty += LH; }
    if (i < paras.length - 1) ty += PG;
  });
  ty += 18;
  g.fillStyle = '#2A1B3D'; g.font = '700 56px "Charm", cursive'; g.textAlign = 'right'; g.fillText(LETTER.signature, x + CW - BP, ty);
  g.restore();
  g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = 'rgba(255,246,251,.62)';
  g.font = '500 26px "Be Vietnam Pro", sans-serif'; g.fillText('Vườn Hoa 20.10 · Ngày Phụ nữ Việt Nam', W / 2, H - 46);
  return cv;
}

function download(url: string, name: string) {
  const a = document.createElement('a'); a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
}

/** Lưu thiệp: điện thoại mở bảng chia sẻ (lưu vào Ảnh), máy tính tải file PNG. */
export function saveCard(art: HTMLCanvasElement | null, mobile: boolean): boolean {
  let url: string;
  try { url = renderCardImage(art).toDataURL('image/png'); } catch { return false; }
  const name = 'thiep-20-10.png';
  if (mobile && typeof navigator.canShare === 'function') {
    try {
      const bin = atob(url.split(',')[1]), arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const file = new File([arr], name, { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: 'Thiệp 20/10' }).catch((err: unknown) => {
          if (!(err instanceof DOMException && err.name === 'AbortError')) download(url, name);
        });
        return true;
      }
    } catch { /* rơi xuống tải về */ }
  }
  download(url, name);
  return true;
}
