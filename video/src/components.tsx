import React from 'react';
import { AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT, GAME_URL, H, W } from './theme';

export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ease = Easing.bezier(0.45, 0, 0.2, 1);

// ───────── 배경 + 상단 제목
export const SceneShell: React.FC<{ badge?: string; title: string; sub?: string; children: React.ReactNode; tone?: 'navy' | 'cream'; titleAt?: number }> = ({ badge, title, sub, children, tone = 'navy', titleAt = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - 4 - titleAt, fps, config: { damping: 18, stiffness: 120 } });
  const dark = tone === 'navy';
  return (
    <AbsoluteFill style={{ fontFamily: FONT, background: dark ? `radial-gradient(1400px 900px at 50% 0%, ${C.navy2} 0%, ${C.navy} 55%, #071d40 100%)` : C.cream }}>
      <Dots dark={dark} />
      <div style={{ position: 'absolute', top: 44, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22, opacity: pop, transform: `translateY(${(1 - pop) * -24}px)` }}>
        {badge && (
          <div style={{ background: C.gold, color: C.navy, fontWeight: 900, fontSize: 34, padding: '8px 22px', borderRadius: 999, letterSpacing: 1 }}>{badge}</div>
        )}
        <div style={{ color: dark ? '#fff' : C.navy, fontWeight: 900, fontSize: 58, letterSpacing: -1 }}>{title}</div>
      </div>
      {sub && (
        <div style={{ position: 'absolute', top: 122, left: 0, right: 0, textAlign: 'center', color: dark ? 'rgba(255,255,255,.72)' : C.muted, fontSize: 28, fontWeight: 700, opacity: interpolate(frame, [12, 26], [0, 1], clamp) }}>{sub}</div>
      )}
      {children}
    </AbsoluteFill>
  );
};

const Dots: React.FC<{ dark: boolean }> = ({ dark }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `radial-gradient(${dark ? 'rgba(255,255,255,.07)' : 'rgba(11,44,95,.06)'} 2px, transparent 2px)`,
        backgroundSize: '36px 36px',
        backgroundPosition: `${frame * 0.3}px ${frame * 0.3}px`,
      }}
    />
  );
};

// ───────── 브라우저 창
export const BrowserFrame: React.FC<{ width?: number; top?: number; children: React.ReactNode; enterDelay?: number }> = ({ width = 1480, top = 178, children, enterDelay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - enterDelay, fps, config: { damping: 20, stiffness: 90 } });
  const scale = width / W;
  const bar = 46;
  return (
    <div
      style={{
        position: 'absolute', left: (W - width) / 2, top, width, height: H * scale + bar,
        borderRadius: 18, overflow: 'hidden', background: '#fff',
        boxShadow: '0 40px 90px rgba(0,0,0,.45), 0 0 0 1px rgba(255,255,255,.08)',
        opacity: s, transform: `translateY(${(1 - s) * 60}px) scale(${0.96 + s * 0.04})`,
      }}
    >
      <div style={{ height: bar, background: '#e9edf3', display: 'flex', alignItems: 'center', padding: '0 18px', gap: 9 }}>
        {['#ff5f57', '#febc2e', '#28c840'].map((c) => <div key={c} style={{ width: 14, height: 14, borderRadius: 7, background: c }} />)}
        <div style={{ marginLeft: 22, flex: 1, maxWidth: 620, height: 30, borderRadius: 8, background: '#fff', color: C.muted, fontSize: 17, display: 'flex', alignItems: 'center', padding: '0 14px', gap: 8, fontFamily: FONT }}>
          <span style={{ fontSize: 14 }}>🔒</span>{GAME_URL}
        </div>
      </div>
      <div style={{ position: 'relative', width: W, height: H, transform: `scale(${scale})`, transformOrigin: '0 0' }}>{children}</div>
    </div>
  );
};

// ───────── 캡처 시퀀스 (+ 카메라, 커서)
export type Cam = { s: number; x: number; y: number };
export type Step = { file: string; hold: number; click?: { x: number; y: number } | null; cam?: Cam };
const FULL: Cam = { s: 1, x: W / 2, y: H / 2 };

function camTransform({ s, x, y }: Cam) {
  const tx = Math.min(0, Math.max(W - W * s, W / 2 - x * s));
  const ty = Math.min(0, Math.max(H - H * s, H / 2 - y * s));
  return `translate(${tx}px, ${ty}px) scale(${s})`;
}

export const ShotSequence: React.FC<{ steps: Step[]; cursorStart?: { x: number; y: number }; showCursor?: boolean; overlay?: (i: number, local: number) => React.ReactNode }> = ({ steps, cursorStart = { x: 1500, y: 900 }, showCursor = true, overlay }) => {
  const frame = useCurrentFrame();
  let start = 0;
  let i = 0;
  for (; i < steps.length - 1; i++) {
    if (frame < start + steps[i].hold) break;
    start += steps[i].hold;
  }
  const local = frame - start;
  const step = steps[i];
  const prev = steps[i - 1];

  // 카메라: 이전 단계 카메라에서 이번 단계 카메라로 부드럽게
  const camOf = (k: number): Cam => {
    for (let j = k; j >= 0; j--) if (steps[j].cam) return steps[j].cam!;
    return FULL;
  };
  const from = i > 0 ? camOf(i - 1) : camOf(0);
  const to = camOf(i);
  const t = interpolate(local, [0, 24], [0, 1], { ...clamp, easing: ease });
  const cam: Cam = { s: from.s + (to.s - from.s) * t, x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };

  // 커서: 직전 클릭 위치 → 이번 클릭 위치
  const lastClick = (k: number) => {
    for (let j = k; j >= 0; j--) if (steps[j].click) return steps[j].click!;
    return cursorStart;
  };
  const p0 = i > 0 ? lastClick(i - 1) : cursorStart;
  const p1 = step.click ?? p0;
  const moveEnd = Math.max(6, Math.min(step.hold - 9, 20));
  const m = interpolate(local, [0, moveEnd], [0, 1], { ...clamp, easing: ease });
  const cx = p0.x + (p1.x - p0.x) * m;
  const cy = p0.y + (p1.y - p0.y) * m;
  const pressAt = step.hold - 7;
  const press = step.click ? interpolate(local, [pressAt - 2, pressAt, pressAt + 4], [1, 0.82, 1], clamp) : 1;
  const ripple = step.click ? interpolate(local, [pressAt, pressAt + 7], [0, 1], clamp) : 0;
  const fadeIn = i > 0 ? interpolate(local, [0, 4], [0, 1], clamp) : 1;

  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: C.cream }}>
      <AbsoluteFill style={{ transform: camTransform(cam), transformOrigin: '0 0' }}>
        {prev && fadeIn < 1 && <Img src={staticFile(prev.file)} style={{ position: 'absolute', width: W, height: H }} />}
        <Img src={staticFile(step.file)} style={{ position: 'absolute', width: W, height: H, opacity: fadeIn }} />
        {showCursor && step.click && ripple > 0 && ripple < 1 && (
          <div style={{ position: 'absolute', left: p1.x - 40 * ripple - 10, top: p1.y - 40 * ripple - 10, width: 80 * ripple + 20, height: 80 * ripple + 20, borderRadius: '50%', border: `5px solid ${C.gold}`, opacity: 1 - ripple }} />
        )}
        {showCursor && <Cursor x={cx} y={cy} scale={press / Math.max(cam.s, 1) * 1.15} />}
        {overlay?.(i, local)}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const stepsDuration = (steps: Step[]) => steps.reduce((s, x) => s + x.hold, 0);

const Cursor: React.FC<{ x: number; y: number; scale: number }> = ({ x, y, scale }) => (
  <svg width={44} height={52} viewBox="0 0 44 52" style={{ position: 'absolute', left: x - 6, top: y - 4, transform: `scale(${scale})`, transformOrigin: '6px 4px', filter: 'drop-shadow(0 6px 10px rgba(0,0,0,.35))' }}>
    <path d="M6 4 L6 42 L16 33 L23 48 L30 45 L23 30 L37 30 Z" fill="#fff" stroke={C.ink} strokeWidth={3} strokeLinejoin="round" />
  </svg>
);

// ───────── 하단 자막 바
export const Caption: React.FC<{ text: string; from?: number; accent?: string; left?: number }> = ({ text, from = 0, accent = C.gold, left }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - from, fps, config: { damping: 16 } });
  if (frame < from) return null;
  return (
    <div style={{ position: 'absolute', left: left ?? 0, right: left === undefined ? 0 : undefined, bottom: 58, display: 'flex', justifyContent: 'center', opacity: s, transform: `translateY(${(1 - s) * 40}px)` }}>
      <div style={{ fontFamily: FONT, background: 'rgba(7,22,48,.92)', color: '#fff', fontSize: 40, fontWeight: 700, padding: '18px 40px', borderRadius: 18, borderLeft: `10px solid ${accent}`, boxShadow: '0 20px 50px rgba(0,0,0,.35)' }}>{text}</div>
    </div>
  );
};

// 타자 치듯 글자 나오기
export const typed = (text: string, frame: number, start: number, cps = 26, fps = 30) => {
  const n = Math.floor(Math.max(0, frame - start) * (cps / fps));
  return Array.from(text).slice(0, n).join('');
};
