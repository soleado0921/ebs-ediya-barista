// Noto Sans KR(OFL) 400/700/900 TTF를 public/fonts/ 에 내려받는다.
import fs from 'node:fs';

const css = await (await fetch('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;900', { headers: { 'User-Agent': 'Mozilla/4.0' } })).text();
fs.mkdirSync('public/fonts', { recursive: true });
for (const [, weight, url] of css.matchAll(/font-weight: (\d+);[\s\S]*?url\((.+?)\)/g)) {
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  fs.writeFileSync(`public/fonts/NotoSansKR-${weight}.ttf`, buf);
  console.log(`NotoSansKR-${weight}.ttf ${(buf.length / 1e6).toFixed(1)}MB`);
}
