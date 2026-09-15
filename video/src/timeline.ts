// 녹화 매니페스트(public/rec/manifest.json)로 장면별 캡처 순서와 길이를 만든다.
import manifest from '../public/rec/manifest.json';
import type { Cam, Step } from './components';

type Shot = { file: string; tag: string; click?: { x: number; y: number } | null; seq?: number; nuisance?: string };
export type Order = { seq: number; name: string; job: string; kind: string; line: string; orderText: string; startEvent: unknown; changes: number };

export const shots = manifest.shots as Shot[];
export const orders = manifest.orders as Order[];
export const events = manifest.events as Array<Record<string, any>>;

const idx = (pred: (s: Shot) => boolean, from = 0) => {
  for (let i = from; i < shots.length; i++) if (pred(shots[i])) return i;
  return -1;
};
export const shotOf = (pred: (s: Shot) => boolean) => shots[idx(pred)];
const toStep = (s: Shot, hold: number, cam?: Cam): Step => ({ file: s.file, hold, click: s.click ?? null, cam });

export const STATION: Cam = { s: 1.5, x: 885, y: 720 };
export const MODAL: Cam = { s: 1.6, x: 960, y: 540 };
export const BUBBLE: Cam = { s: 1.55, x: 1060, y: 330 };
export const DRAWER: Cam = { s: 1.45, x: 1660, y: 420 };

// 장면 2: 시작 화면
export const titleSteps: Step[] = [
  ...shots.filter((s) => s.tag.startsWith('title-')).map((s) => toStep(s, 38)),
  toStep(shotOf((s) => s.tag === 'order'), 50),
];

// 장면 4: 첫 손님 음료 만들기
const firstOrder = idx((s) => s.tag === 'order');
const firstServe = idx((s) => s.tag === 'serve');
export const makeSteps: Step[] = [
  toStep(shots[firstOrder], 36),
  ...shots.slice(firstOrder + 1, firstServe).map((s) => toStep(s, s.tag === 'make-done' ? 30 : 24, STATION)),
  toStep(shots[firstServe], 34, STATION),
];

// 장면 5: 채점 결과 + EBS 캐릭터
export const resultShot = shotOf((s) => s.tag === 'result');
export const easterShot = shotOf((s) => s.tag === 'easter-splash');

// 장면 6: 진상 손님 (말 바꾸기 → 가짜 단골 응대)
export const changeShot = shotOf((s) => s.tag === 'change-alert');
const lastOpen = (() => { let k = -1; shots.forEach((s, i) => { if (s.tag === 'respond-open') k = i; }); return k; })();
const judge = idx((s) => s.tag === 'respond-judge', lastOpen);
export const respondSteps: Step[] = [
  toStep(changeShot, 70, BUBBLE),
  ...shots.slice(lastOpen, judge + 1).map((s) => {
    const hold = s.tag === 'respond-open' ? 60 : s.tag === 'respond-judge' ? 80 : s.tag === 'respond-evidence' ? 30 : 36;
    return toStep(s, hold, MODAL);
  }),
];
export const respondOrder = orders.find((o) => o.startEvent) ?? orders[orders.length - 1];

// 장면 7: AI/DB 보기
export const traceShot = shotOf((s) => s.tag === 'trace-json');
// 장면 8: 마감 리포트
export const reportShot = shotOf((s) => s.tag === 'report');
export const endEvent = events.find((e) => e.type === 'end');

// 장면 3: 같은 방식, 다른 말투 (진상이 아닌 손님 3명)
export const talkers = orders.filter((o) => o.kind !== 'nuisance').slice(0, 3).map((o) => ({
  ...o,
  // 주문 직후 알림(이스터에그 안내 등)이 사라진 서빙 직전 캡처에서 얼굴을 잘라 쓴다
  orderShot: shots[idx((s) => s.tag === 'serve', idx((s) => s.tag === 'order' && s.seq === o.seq))],
}));
