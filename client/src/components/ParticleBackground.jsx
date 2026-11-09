// References: [24] MDN Canvas API, [25] MDN prefers-reduced-motion.
// README section 16.
import { useEffect, useRef } from 'react';

/**
 * Animated background: a slowly turning 3D field of points, joined by faint
 * lines when they come close, with nearer points drawn larger and brighter.
 *
 * Security / CSP notes:
 * - Everything is drawn on a <canvas> by our own bundled script, so the
 *   strict Content Security Policy (script-src 'self', style-src 'self')
 *   still holds. No inline styles, no third-party libraries, no network.
 * - The canvas is aria-hidden and ignores pointer events, so it never gets
 *   in the way of forms or screen readers.
 *
 * Comfort / performance:
 * - Respects "reduce motion" (draws one still frame instead of animating).
 * - Pauses while the browser tab is hidden.
 * - Point count scales with screen size and is capped.
 */
const COLORS = ['25, 179, 141', '244, 178, 62', '120, 160, 255'];

export default function ParticleBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    // The automated tests run in a simulated browser with no canvas support.
    if (import.meta.env.MODE === 'test') return undefined;
    const canvas = canvasRef.current;
    const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
    if (!ctx) return undefined;

    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 0;
    let height = 0;
    let points = [];
    let frameId = 0;
    let angle = 0;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

    const makePoints = () => {
      const count = Math.min(180, Math.round((width * height) / 7000));
      points = Array.from({ length: count }, () => ({
        // Positions inside a cube from -1 to 1 on each axis
        x: Math.random() * 2 - 1,
        y: Math.random() * 2 - 1,
        z: Math.random() * 2 - 1,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      }));
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      makePoints();
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const tiltX = pointer.y * 0.25;
      const cosT = Math.cos(tiltX);
      const sinT = Math.sin(tiltX);
      const spread = Math.max(width, height) * 0.5;
      const focal = 2.6;

      // Rotate each point in 3D, then project it onto the screen
      const projected = points.map((p) => {
        const rx = p.x * cos - p.z * sin + pointer.x * 0.15;
        const rz = p.x * sin + p.z * cos;
        const ry = p.y * cosT - rz * sinT;
        const depth = p.y * sinT + rz * cosT;
        const scale = focal / (focal + depth);
        return {
          sx: width / 2 + rx * spread * scale,
          sy: height / 2 + ry * spread * scale,
          scale,
          color: p.color,
        };
      });
    // Faint connecting lines between nearby points
      const linkDist = 150;
      for (let i = 0; i < projected.length; i += 1) {
        const a = projected[i];
        for (let j = i + 1; j < projected.length; j += 1) {
          const b = projected[j];
          const dx = a.sx - b.sx;
          const dy = a.sy - b.sy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < linkDist) {
            const alpha = (1 - dist / linkDist) * 0.35 * Math.min(a.scale, b.scale);
            ctx.strokeStyle = `rgba(${a.color}, ${alpha.toFixed(3)})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(a.sx, a.sy);
            ctx.lineTo(b.sx, b.sy);
            ctx.stroke();
          }
        }
      }

      // The points themselves: nearer ones are larger and brighter
      projected.forEach((p) => {
        const r = 1.1 + p.scale * 1.6;
        const alpha = Math.min(1, 0.35 + (p.scale - 0.7) * 1.1);
        ctx.fillStyle = `rgba(${p.color}, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    const tick = () => {
      angle += 0.0009;
      pointer.x += (pointer.tx - pointer.x) * 0.03;
      pointer.y += (pointer.ty - pointer.y) * 0.03;
      draw();
      frameId = window.requestAnimationFrame(tick);
    };

    const onPointerMove = (e) => {
      pointer.tx = (e.clientX / width) * 2 - 1;
      pointer.ty = (e.clientY / height) * 2 - 1;
    };

    const onVisibility = () => {
      if (document.hidden) {
        window.cancelAnimationFrame(frameId);
      } else if (!reduceMotion) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    resize();
    window.addEventListener('resize', resize);

    if (reduceMotion) {
      draw();
    } else {
      window.addEventListener('pointermove', onPointerMove);
      document.addEventListener('visibilitychange', onVisibility);
      frameId = window.requestAnimationFrame(tick);
    }

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className="bg-canvas" aria-hidden="true" />;
}
