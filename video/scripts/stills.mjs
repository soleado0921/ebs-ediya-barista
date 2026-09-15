// 검수용: 지정 프레임을 PNG로 뽑는다. node scripts/stills.mjs 60 200 ...
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import path from 'node:path';

const frames = process.argv.slice(2).map(Number);
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
const composition = await selectComposition({ serveUrl, id: 'Intro' });
console.log('duration', composition.durationInFrames);
for (const frame of frames) {
  await renderStill({ serveUrl, composition, frame, output: `out/stills/f${String(frame).padStart(4, '0')}.png`, scale: 0.5 });
  console.log('still', frame);
}
