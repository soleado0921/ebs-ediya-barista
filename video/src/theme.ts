import { continueRender, delayRender, staticFile } from 'remotion';

// 게임(public/style.css)과 같은 색
export const C = {
  navy: '#0b2c5f',
  navy2: '#163d7d',
  navy3: '#25508f',
  cream: '#f6f2eb',
  paper: '#fffdf9',
  wood: '#b98a5c',
  ink: '#1c2330',
  muted: '#6d7482',
  line: '#e5ddd0',
  gold: '#d9a441',
  red: '#d24b4b',
  green: '#2e9b68',
  blue: '#2f6fd6',
  coffee: '#6b4226',
  purple: '#7b5bd6',
};

export const FONT = 'Noto Sans KR';
export const FPS = 30;
export const W = 1920;
export const H = 1080;
export const GAME_URL = 'ebs-ediya-barista.vercel.app';
export const GITHUB = 'github.com/soleado0921/ebs-ediya-barista';

// 로컬 폰트 파일을 렌더 전에 모두 불러온다 (네트워크 불필요)
const handle = delayRender('Noto Sans KR 불러오기');
Promise.all(
  (['400', '700', '900'] as const).map((w) => {
    const face = new FontFace(FONT, `url(${staticFile(`fonts/NotoSansKR-${w}.ttf`)}) format('truetype')`, { weight: w });
    return face.load().then((f) => document.fonts.add(f));
  }),
)
  .then(() => continueRender(handle))
  .catch((err) => {
    console.error(err);
    continueRender(handle);
  });
