// 로컬 게임(http://localhost:3000)을 시연 모드로 한 판 자동 플레이하면서
// 1920×1080 캡처와 클릭 좌표를 public/rec/ 에 기록한다. (영상 소스)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public', 'rec');
const URL = process.env.GAME_URL ?? 'http://localhost:3000';

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, locale: 'ko-KR' });
const page = await ctx.newPage();

const shots = [];
const orders = [];
const events = [];
let n = 0;
let latestExpected = null;

page.on('response', async (r) => {
  const u = r.url();
  try {
    if (/\/api\/shifts\/\d+\/next$/.test(u)) {
      const j = await r.json();
      orders.push({ seq: j.order.seq, name: j.order.customer.name, job: j.order.customer.job, emoji: j.order.customer.emoji, kind: j.order.kind, line: j.order.line, orderText: j.db.orderText, expected: j.db.expected, nuisance: j.db.nuisance, changes: j.order.changes, startEvent: j.order.startEvent });
    } else if (/\/event$/.test(u)) {
      const j = await r.json();
      events.push({ type: 'change', line: j.line, change: j.db.change, expected: j.db.expected });
      latestExpected = j.db.expected;
    } else if (/\/serve$/.test(u)) {
      const j = await r.json();
      events.push({ type: 'serve', score: j.result.score, grade: j.result.grade, line: j.line, followUp: j.followUp ?? null });
    } else if (/\/respond$/.test(u)) {
      const j = await r.json();
      events.push({ type: 'respond', grade: j.judge.grade, points: j.judge.points, line: j.line });
    } else if (/\/end$/.test(u)) {
      const j = await r.json();
      events.push({ type: 'end', headline: j.report.headline, stats: j.stats });
    }
  } catch { /* JSON이 아닌 응답은 무시 */ }
});

const pad = (i) => String(i).padStart(3, '0');
async function snap(tag, extra = {}) {
  const file = `rec/${pad(++n)}-${tag}.png`;
  await page.screenshot({ path: path.join(ROOT, 'public', file) });
  shots.push({ file, tag, t: Date.now(), ...extra });
  return file;
}
async function center(locator) {
  const b = await locator.boundingBox();
  return b ? { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) } : null;
}
// 클릭 직전 화면을 찍고(커서 목표 좌표 포함) 클릭한다.
async function click(locator, tag, opts = {}) {
  await locator.scrollIntoViewIfNeeded();
  if (opts.snap !== false) await snap(tag, { click: await center(locator) });
  await locator.click(opts.position ? { position: opts.position } : {});
}
const wait = (ms) => page.waitForTimeout(ms);

const REPLIES = {
  fake_regular: '찾아주셔서 감사합니다! 방문 기록을 확인해 보니 스탬프가 아직 모이지 않아 무료 음료나 할인은 어렵습니다. 대신 오늘 스탬프 1개 적립해 드릴게요.',
  insist: '불편을 드려 죄송합니다. 대화 기록을 확인해 보니 처음 말씀하신 주문대로 만들었어요. 원하시면 차액 없이 가능한 선에서 새로 주문 도와드릴게요.',
  refund: '불편을 드려 죄송합니다. 주문 기록을 확인해 보니 레시피대로 정확히 제조되어 규정상 환불은 어렵습니다. 대신 다음 방문 때 입맛에 맞게 조절해 드릴게요.',
  unreasonable: '말씀 감사합니다. 매장 규정상 사이즈 업은 700원이 추가되고 직원 재량 할인은 어렵습니다. 대신 스탬프 적립은 바로 해드릴게요.',
};

async function handleRespond(capture) {
  const modal = page.locator('.modal').filter({ has: page.locator('#respond-form') });
  await modal.waitFor({ timeout: 60000 });
  await wait(700);
  const title = await modal.locator('h2').innerText();
  const type = Object.entries({ fake_regular: '서비스', insist: '분명히', refund: '환불', unreasonable: '무리한' }).find(([, k]) => title.includes(k))?.[0] ?? 'insist';
  if (capture) await snap('respond-open', { nuisance: type });
  const tabs = { fake_regular: ['ledger', 'policy'], insist: ['log'], refund: ['ledger', 'policy'], unreasonable: ['policy'] }[type];
  for (const t of tabs) {
    await click(modal.locator(`[data-ev="${t}"]`), `respond-ev-${t}`, { snap: capture });
    await wait(900);
  }
  if (capture) await snap('respond-evidence', { nuisance: type });
  const box = modal.locator('#respond-text');
  await box.click();
  await box.fill(REPLIES[type]);
  await wait(300);
  await click(modal.locator('#respond-send'), 'respond-send', { snap: capture });
  await page.locator('#judge-ok').waitFor({ timeout: 60000 });
  await wait(900);
  if (capture) await snap('respond-judge', { nuisance: type });
  await page.locator('#judge-ok').click();
  await wait(600);
}

async function build(expected, capture) {
  const cup = page.locator(`#cup-picker .cup-btn[data-cup="${expected.cup}"][data-size="${expected.size}"]`);
  await click(cup, 'make-cup', { snap: capture });
  await wait(250);
  for (const [id, cnt] of Object.entries(expected.ingredients)) {
    for (let i = 0; i < cnt; i++) {
      await click(page.locator(`button.ing[data-id="${id}"]`), `make-${id}`, { snap: capture, position: { x: 30, y: 40 } });
      await wait(220);
    }
  }
  await wait(500);
  if (capture) await snap('make-done');
}

// ───────── 시작 화면
await page.goto(URL, { waitUntil: 'networkidle' });
await wait(800);
const nameBox = page.getByRole('textbox', { name: '바리스타 이름' });
await nameBox.fill('');
await snap('title-empty', { click: await center(nameBox) });
await nameBox.fill('김알바');
await wait(300);
await click(page.locator('#demo-mode'), 'title-name');
await wait(300);
await click(page.getByRole('button', { name: '영업 시작' }), 'title-demo');

const TOTAL = 7;
for (let seq = 1; seq <= TOTAL; seq++) {
  const capture = true;
  // 손님 등장 대기 (이스터에그 스플래시 포착)
  let sawSplash = false;
  for (let k = 0; k < 400; k++) {
    const st = await page.evaluate(() => {
      if (document.querySelector('.easter-splash')) return 'splash';
      const b = document.querySelector('#bubble');
      return b && !b.hidden && document.querySelector('#chat-log .msg, #chat-log div') ? 'ready' : 'wait';
    });
    if (st === 'splash' && !sawSplash) { sawSplash = true; await wait(600); await snap('easter-splash'); }
    if (st === 'ready' && orders.some((o) => o.seq === seq)) break;
    await wait(150);
  }
  await wait(900);
  const order = orders.find((o) => o.seq === seq);
  if (!order) throw new Error(`주문 데이터를 못 받음: ${seq}`);
  latestExpected = order.expected;

  if (order.startEvent) {
    await handleRespond(capture);
  }
  await snap('order', { seq });

  if (seq === 3) {
    // AI/DB 보기 서랍 (정답 JSON 펼침)
    await click(page.locator('#trace-toggle'), 'trace-open');
    await wait(900);
    await snap('trace');
    await click(page.locator('#trace-list details summary').first(), 'trace-details');
    await wait(700);
    await snap('trace-json');
    await page.locator('#trace-drawer').getByRole('button', { name: '닫기' }).click();
    await wait(500);
  }

  if (order.changes) {
    // 말 바꾸기: 재료를 조금 넣으면 손님이 주문을 바꾼다
    const before = events.filter((e) => e.type === 'change').length;
    await build({ cup: order.expected.cup, size: order.expected.size, ingredients: Object.fromEntries(Object.entries(order.expected.ingredients).slice(0, 2)) }, capture);
    await page.waitForFunction(() => document.querySelector('#bubble')?.classList.contains('rush'), null, { timeout: 40000 }).catch(() => {});
    for (let k = 0; k < 40 && events.filter((e) => e.type === 'change').length === before; k++) await wait(250);
    await wait(900);
    await snap('change-alert', { seq });
    await click(page.getByRole('button', { name: '🗑 버리기' }), 'make-discard');
    await wait(400);
    // 두 번째 변경이 올 수 있으니 조금 기다린 뒤 최신 정답으로 제조
    await build(latestExpected, false);
    await wait(1500);
    const changes = events.filter((e) => e.type === 'change').length;
    if (changes - before > 1) { await page.getByRole('button', { name: '🗑 버리기' }).click(); await build(latestExpected, false); }
  } else {
    await build(order.expected, capture);
  }

  await click(page.getByRole('button', { name: '서빙하기 ▶' }), 'serve', { seq });
  const next = page.locator('#result-next');
  const respond = page.locator('#respond-form');
  await Promise.race([next.waitFor({ timeout: 90000 }), respond.waitFor({ timeout: 90000 })]);
  if (await respond.isVisible().catch(() => false)) await handleRespond(capture);
  await next.waitFor({ timeout: 90000 });
  await wait(1100);
  await snap('result', { seq });

  await click(next, seq === TOTAL ? 'close-shift' : 'next', { seq });
  await wait(900);
}

// ───────── 마감 리포트
await page.locator('#screen-report:not([hidden])').waitFor({ timeout: 120000 });
await wait(1500);
await snap('report');
await page.evaluate(() => window.scrollTo(0, 700));
await wait(600);
await snap('report-2');

fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({ viewport: { width: 1920, height: 1080 }, shots, orders, events }, null, 2));
console.log(`캡처 ${shots.length}장, 손님 ${orders.length}명`);
for (const e of events) console.log(e.type, e.score ?? e.grade ?? '', (e.line ?? e.headline ?? '').slice(0, 60));
await browser.close();
