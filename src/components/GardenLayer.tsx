import { useEffect, useRef } from 'react';
import { GardenEngine, type GardenMode } from '../garden/engine';

interface Props { mode: GardenMode; onReady: (g: GardenEngine | null) => void }

/**
 * Canvas khu vườn cố định phía sau mọi trang. Trang vườn: rõ nét, chạm được.
 * Các trang khác: vườn mờ, hạ thấp và chỉ vẽ 30 khung/giây, nên hoa vẫn tiếp tục nở khi người xem đọc thư.
 */
export function GardenLayer({ mode, onReady }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const eng = useRef<GardenEngine | null>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    let g: GardenEngine | null = null;
    try { g = new GardenEngine(cv); g.start(); } catch { g = null; }
    eng.current = g;
    onReady(g);
    return () => { g?.destroy(); eng.current = null; onReady(null); };
  }, [onReady]);

  useEffect(() => { eng.current?.setMode(mode); }, [mode]);

  return (
    <div className={`garden-layer ${mode}`} aria-hidden="true">
      <canvas ref={ref} />
    </div>
  );
}
