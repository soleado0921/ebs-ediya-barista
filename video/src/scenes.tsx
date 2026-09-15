import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { BrowserFrame, Caption, SceneShell, ShotSequence, clamp, stepsDuration, typed } from './components';
import { C, FONT, GAME_URL, GITHUB } from './theme';
import * as T from './timeline';

// ───────── 1. 인트로
export const INTRO = 120;
export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fill = interpolate(frame, [8, 58], [0, 1], { ...clamp, easing: (t) => 1 - (1 - t) ** 3 });
  const title = spring({ frame: frame - 34, fps, config: { damping: 14, stiffness: 110 } });
  const sub = interpolate(frame, [56, 72], [0, 1], clamp);
  const cupIn = spring({ frame, fps, config: { damping: 15 } });
  const liquidTop = 300 - 210 * fill;
  return (
    <AbsoluteFill style={{ fontFamily: FONT, background: `radial-gradient(1200px 800px at 50% 40%, ${C.navy2}, ${C.navy} 60%, #061735)` }}>
      <AbsoluteFill style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.06) 2px, transparent 2px)', backgroundSize: '36px 36px' }} />
      <div style={{ position: 'absolute', left: 960 - 110, top: 150, transform: `scale(${cupIn}) translateY(${(1 - cupIn) * 60}px)` }}>
        <svg width={220} height={330} viewBox="0 0 220 330">
          <defs><clipPath id="cup"><path d="M30 60 L190 60 L166 310 L54 310 Z" /></clipPath></defs>
          {[0, 1, 2].map((k) => {
            const o = interpolate((frame + k * 14) % 42, [0, 20, 42], [0, 0.7, 0]) * fill;
            const y = interpolate((frame + k * 14) % 42, [0, 42], [40, 0]);
            return <path key={k} d={`M${80 + k * 30} ${46 + y} q -12 -14 0 -28 q 12 -14 0 -28`} stroke="#fff" strokeWidth={6} fill="none" strokeLinecap="round" opacity={o} />;
          })}
          <g clipPath="url(#cup)">
            <rect x={0} y={liquidTop + 10} width={220} height={330} fill={C.coffee} />
            <rect x={0} y={liquidTop} width={220} height={26} fill="#c89a6a" />
          </g>
          <path d="M30 60 L190 60 L166 310 L54 310 Z" fill="rgba(255,255,255,.08)" stroke="#fff" strokeWidth={7} strokeLinejoin="round" />
          <rect x={20} y={46} width={180} height={18} rx={6} fill="#fff" />
          <rect x={48} y={150} width={124} height={54} fill={C.navy} opacity={0.85} />
          <text x={110} y={186} textAnchor="middle" fill="#fff" fontSize={22} fontWeight={900} letterSpacing={4} fontFamily={FONT}>EDIYA</text>
        </svg>
      </div>
      <div style={{ position: 'absolute', top: 520, left: 0, right: 0, textAlign: 'center', opacity: title, transform: `translateY(${(1 - title) * 50}px)` }}>
        <div style={{ color: C.gold, fontSize: 32, fontWeight: 900, letterSpacing: 8 }}>EDIYA COFFEE · EBS 1호점</div>
        <div style={{ color: '#fff', fontSize: 132, fontWeight: 900, letterSpacing: -3, marginTop: 6 }}>EBS 이디야 바리스타</div>
      </div>
      <div style={{ position: 'absolute', top: 780, left: 0, right: 0, textAlign: 'center', color: 'rgba(255,255,255,.8)', fontSize: 38, fontWeight: 700, opacity: sub }}>
        데이터베이스 × 생성형 AI로 만든 교육용 카페 게임
      </div>
    </AbsoluteFill>
  );
};

// ───────── 2. 도입: 시작 화면
export const TITLE = stepsDuration(T.titleSteps) + 10;
export const TitleScene: React.FC = () => (
  <SceneShell title="오늘부터 EBS 사옥 1층 카페 알바생 ☕">
    <BrowserFrame>
      <ShotSequence steps={T.titleSteps} cursorStart={{ x: 1300, y: 760 }} />
    </BrowserFrame>
  </SceneShell>
);

// ───────── 3. 듣기: AI 손님 대사
export const LISTEN = 345;
const ROW = 100;
export const ListenScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <SceneShell badge="① 듣기" title="손님은 AI가, 매번 다른 말투로 주문해요">
      <div style={{ position: 'absolute', top: 200, left: 110, right: 110, display: 'flex', flexDirection: 'column', gap: 34 }}>
        {T.talkers.map((o, k) => {
          const start = 12 + k * ROW;
          const s = spring({ frame: frame - start, fps, config: { damping: 18 } });
          const text = typed(o.line, frame, start + 26, 30);
          const chip = interpolate(frame, [start + 6, start + 18], [0, 1], clamp);
          return (
            <div key={o.seq} style={{ display: 'flex', alignItems: 'center', gap: 34, opacity: s, transform: `translateX(${(1 - s) * -80}px)` }}>
              <div style={{ width: 200, textAlign: 'center', flexShrink: 0 }}>
                <div style={{ width: 170, height: 170, margin: '0 auto', borderRadius: '50%', overflow: 'hidden', background: '#dfe9f5', border: `6px solid ${o.kind === 'easter' ? C.gold : '#fff'}`, position: 'relative' }}>
                  {o.orderShot && <Img src={staticFile(o.orderShot.file)} style={{ position: 'absolute', width: 1920 * 0.95, height: 1080 * 0.95, left: -(960 * 0.95 - 85), top: -(115 * 0.95) }} />}
                </div>
                <div style={{ color: '#fff', fontWeight: 900, fontSize: 30, marginTop: 10 }}>{o.name}</div>
                <div style={{ color: 'rgba(255,255,255,.65)', fontWeight: 700, fontSize: 20 }}>{o.job}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,.1)', border: '2px solid rgba(255,255,255,.18)', color: '#fff', borderRadius: 12, padding: '6px 16px', fontSize: 24, fontWeight: 700, opacity: chip, marginBottom: 12 }}>
                  <span style={{ background: C.blue, borderRadius: 8, padding: '2px 10px', fontSize: 20, fontWeight: 900 }}>DB 정답</span>{o.orderText}
                </div>
                <div style={{ position: 'relative', background: '#fff', color: C.ink, borderRadius: 24, padding: '22px 30px', fontSize: 31, fontWeight: 700, lineHeight: 1.45, minHeight: 92, boxShadow: '0 16px 40px rgba(0,0,0,.25)' }}>
                  <span style={{ position: 'absolute', top: -14, right: 24, background: C.purple, color: '#fff', borderRadius: 8, padding: '2px 12px', fontSize: 20, fontWeight: 900 }}>AI 대사</span>
                  {text}
                  {text.length < Array.from(o.line).length && frame >= start + 26 && <span style={{ opacity: Math.floor(frame / 8) % 2 ? 1 : 0.2, color: C.purple }}>▍</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </SceneShell>
  );
};

// ───────── 4. 만들기
export const MAKE = stepsDuration(T.makeSteps) + 8;
export const MakeScene: React.FC = () => (
  <SceneShell badge="② 만들기" title="컵을 고르고, 레시피와 옵션 규칙대로 제조">
    <BrowserFrame>
      <ShotSequence steps={T.makeSteps} cursorStart={{ x: 1100, y: 800 }} />
    </BrowserFrame>
  </SceneShell>
);

// ───────── 5. 채점
export const SCORE = 255;
export const ScoreScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const RULES = [['온도 틀림', '-25'], ['사이즈 틀림', '-10'], ['재료 1개 차이', '-12'], ['버린 음료', '-5']];
  const second = frame >= 150;
  const steps = [
    { file: T.resultShot.file, hold: 150, cam: { s: 1.45, x: 1160, y: 560 } },
    { file: (T.easterShot ?? T.resultShot).file, hold: 105, cam: { s: 1.25, x: 960, y: 520 } },
  ];
  return (
    <SceneShell badge="③ 채점" titleAt={second ? 150 : 0} title={second ? '가끔은 EBS 캐릭터 손님도 찾아와요 ✨' : '채점은 서버가, 레시피와 한 항목씩 비교해요'}>
      <BrowserFrame enterDelay={0}>
        <ShotSequence steps={steps} showCursor={false} />
      </BrowserFrame>
      {!second && (
        <div style={{ position: 'absolute', top: 300, right: 90, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 18 }}>
          <div style={{ fontFamily: FONT, color: C.gold, fontSize: 28, fontWeight: 900, opacity: interpolate(frame, [30, 40], [0, 1], clamp) }}>감점 규칙</div>
          {RULES.map(([k, v], i) => {
            const s = spring({ frame: frame - 40 - i * 8, fps, config: { damping: 14 } });
            return (
              <div key={k} style={{ fontFamily: FONT, opacity: s, transform: `translateX(${(1 - s) * 40}px)`, background: 'rgba(7,22,48,.93)', color: '#fff', borderRadius: 14, padding: '14px 24px', fontSize: 30, fontWeight: 700, boxShadow: '0 14px 30px rgba(0,0,0,.3)' }}>
                {k} <b style={{ color: '#ff8a8a', marginLeft: 8 }}>{v}</b>
              </div>
            );
          })}
        </div>
      )}
      {second && <Caption from={160} text="팁 2배 · 도감에 기록돼요" />}
    </SceneShell>
  );
};

// ───────── 6. 진상 손님
export const NUISANCE = stepsDuration(T.respondSteps) + 10;
export const NuisanceScene: React.FC = () => {
  const frame = useCurrentFrame();
  const changeEnd = T.respondSteps[0].hold;
  return (
    <SceneShell badge="④ 응대" titleAt={frame < changeEnd ? 0 : changeEnd} title={frame < changeEnd ? '말 바꾸기 · 우기기 · 가짜 단골 · 환불 요구…' : '기록과 규정을 근거로 응대하면 S등급!'}>
      <BrowserFrame>
        <ShotSequence steps={T.respondSteps} cursorStart={{ x: 1200, y: 700 }} />
      </BrowserFrame>
    </SceneShell>
  );
};

// ───────── 7. 핵심 원칙: DB × AI
export const PRINCIPLE = 285;
export const PrincipleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const SWITCH = 150;
  const col = (items: string[], color: string, label: string, sub: string, delay: number, side: 'l' | 'r') => {
    const s = spring({ frame: frame - delay, fps, config: { damping: 16 } });
    return (
      <div style={{ width: 700, background: 'rgba(255,255,255,.06)', border: `3px solid ${color}`, borderRadius: 28, padding: '34px 40px', opacity: s, transform: `translateX(${(1 - s) * (side === 'l' ? -80 : 80)}px)` }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
          <span style={{ background: color, color: '#fff', borderRadius: 12, padding: '4px 18px', fontSize: 40, fontWeight: 900 }}>{label}</span>
          <span style={{ color: 'rgba(255,255,255,.75)', fontSize: 30, fontWeight: 700 }}>{sub}</span>
        </div>
        <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {items.map((it, i) => {
            const o = interpolate(frame, [delay + 14 + i * 7, delay + 24 + i * 7], [0, 1], clamp);
            return <div key={it} style={{ opacity: o, color: '#fff', fontSize: 36, fontWeight: 700, display: 'flex', gap: 14 }}><span style={{ color }}>●</span>{it}</div>;
          })}
        </div>
      </div>
    );
  };
  if (frame >= SWITCH) {
    return (
      <SceneShell title="화면에서 바로 확인하는 AI/DB 보기" titleAt={SWITCH}>
        <BrowserFrame enterDelay={SWITCH}>
          <Img src={staticFile(T.traceShot.file)} style={{ width: 1920, height: 1080 }} />
        </BrowserFrame>
        <Caption from={SWITCH + 40} left={150} accent={C.blue} text="DB가 정한 정답 JSON과 AI 응답을 나란히" />
        <DrawerZoom frame={frame - SWITCH} />
      </SceneShell>
    );
  }
  const vs = spring({ frame: frame - 40, fps, config: { damping: 12 } });
  return (
    <SceneShell title="정답은 DB가 정하고, 말은 AI가 한다">
      <div style={{ position: 'absolute', top: 300, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 60, fontFamily: FONT }}>
        {col(['메뉴 · 레시피 · 주문 정답', '채점 · 매출 · 팁 계산', '진상 응대 등급 판정', '단골 방문 기록 · 스탬프'], C.blue, 'DB · 서버', '정확해야 하는 것', 10, 'l')}
        <div style={{ color: C.gold, fontSize: 60, fontWeight: 900, transform: `scale(${vs})` }}>×</div>
        {col(['손님 주문 대사', '되묻기 답변', '결과 반응 · 단골 메모', '마감 리포트 · 리뷰'], C.purple, '생성형 AI', '자연스러워야 하는 것', 26, 'r')}
      </div>
      <Caption from={70} text="AI는 정답을 지어내지 않고, 정해진 정답을 사람처럼 말할 뿐이에요" />
    </SceneShell>
  );
};

// AI/DB 서랍 확대 이미지를 브라우저 위에 띄운다
const DrawerZoom: React.FC<{ frame: number }> = ({ frame }) => {
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - 12, fps, config: { damping: 18 } });
  const crop = { x: 1400, y: 90, w: 520, h: 560 };
  const k = 1.35;
  return (
    <div style={{ position: 'absolute', right: 110, top: 210, width: crop.w * k, height: crop.h * k, borderRadius: 22, overflow: 'hidden', boxShadow: '0 40px 90px rgba(0,0,0,.5)', border: `5px solid ${C.gold}`, opacity: s, transform: `scale(${0.85 + s * 0.15})`, transformOrigin: '100% 0' }}>
      <Img src={staticFile(T.traceShot.file)} style={{ position: 'absolute', width: 1920 * k, height: 1080 * k, left: -crop.x * k, top: -crop.y * k }} />
    </div>
  );
};

// ───────── 8. 마무리
export const OUTRO = 225;
export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const card = spring({ frame: frame - 10, fps, config: { damping: 15 } });
  const btn = spring({ frame: frame - 45, fps, config: { damping: 10 } });
  const stats = T.endEvent?.stats;
  return (
    <AbsoluteFill style={{ fontFamily: FONT, background: C.navy }}>
      <Img src={staticFile(T.reportShot.file)} style={{ position: 'absolute', width: 1920, height: 1080, filter: 'blur(10px) brightness(.45)', transform: `scale(${1.08 + frame * 0.0006})` }} />
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(11,44,95,.55), rgba(6,23,53,.9))' }} />
      <div style={{ position: 'absolute', top: 150, left: 0, right: 0, textAlign: 'center', opacity: card, transform: `translateY(${(1 - card) * 40}px)` }}>
        <div style={{ color: C.gold, fontSize: 34, fontWeight: 900, letterSpacing: 6 }}>마감 리포트까지 5분이면 한 판 끝!</div>
        {stats && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 26, marginTop: 30 }}>
            {[['응대 손님', `${stats.served}명`], ['평균 점수', `${stats.avgScore}점`], ['완벽한 음료', `${stats.perfect}잔`], ['총점', `${stats.totalScore}점`]].map(([k, v], i) => {
              const s = spring({ frame: frame - 18 - i * 6, fps, config: { damping: 14 } });
              return (
                <div key={k} style={{ opacity: s, transform: `scale(${0.8 + s * 0.2})`, background: 'rgba(255,255,255,.1)', border: '2px solid rgba(255,255,255,.2)', borderRadius: 20, padding: '18px 34px', minWidth: 210 }}>
                  <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 24, fontWeight: 700 }}>{k}</div>
                  <div style={{ color: '#fff', fontSize: 50, fontWeight: 900 }}>{v}</div>
                </div>
              );
            })}
          </div>
        )}
        <div style={{ color: '#fff', fontSize: 104, fontWeight: 900, letterSpacing: -2, marginTop: 70 }}>EBS 이디야 바리스타</div>
      </div>
      <div style={{ position: 'absolute', top: 700, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26 }}>
        <div style={{ transform: `scale(${btn})`, background: C.gold, color: C.navy, fontSize: 52, fontWeight: 900, padding: '22px 56px', borderRadius: 999, boxShadow: '0 20px 50px rgba(0,0,0,.4)' }}>
          ▶ 지금 플레이 · {GAME_URL}
        </div>
        <div style={{ color: 'rgba(255,255,255,.75)', fontSize: 30, fontWeight: 700, opacity: interpolate(frame, [70, 85], [0, 1], clamp) }}>
          소스 코드 · {GITHUB}
        </div>
      </div>
    </AbsoluteFill>
  );
};
