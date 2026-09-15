import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as store from './src/db.js';
import * as game from './src/game.js';
import * as ai from './src/ai.js';
import { STORE } from './src/content.js';

const app = express();
const here = path.dirname(fileURLToPath(import.meta.url));
app.use(express.json({ limit: '64kb' }));
app.use(express.static(path.join(here, 'public'))); // 로컬용. Vercel에서는 public/ 폴더를 CDN이 직접 서빙한다.
app.use('/api', async (req, res, next) => { try { await store.ready; next(); } catch (err) { next(err); } });

const PORT = Number(process.env.PORT || 3000);
const menuList = () => store.getMenu();
const menuById = async () => Object.fromEntries((await menuList()).map((m) => [m.id, m]));
const policyValue = async (key) => (await store.getPolicies()).find((p) => p.key === key)?.value;

class GameError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, message) => { throw new GameError(status, message); };

async function requireOrder(id) {
  const order = await store.getOrder(Number(id));
  if (!order) fail(404, '주문을 찾을 수 없어요.');
  const shift = await store.getShift(order.shift_id);
  return { order, shift };
}

function publicCustomer(c) {
  return { id: c.id, name: c.name, job: c.job, kind: c.kind, avatar: c.avatar, emoji: c.emoji, color: c.color };
}

async function ledgerView(player, customerId) {
  const byId = await menuById();
  return (await store.getLedger(player, customerId)).map((l) => ({
    ...l, text: byId[l.target.menuId] ? game.describeTarget(l.target, byId[l.target.menuId]).text : '(삭제된 메뉴)',
  }));
}

async function sanitizeBuild(build) {
  if (!build || typeof build !== 'object') return null;
  const ids = new Set((await store.getIngredients()).map((i) => i.id));
  const ingredients = {};
  for (const [k, v] of Object.entries(build.ingredients ?? {})) {
    const n = Math.floor(Number(v));
    if (ids.has(k) && n > 0) ingredients[k] = Math.min(n, 10);
  }
  return {
    cup: ['HOT', 'ICED'].includes(build.cup) ? build.cup : null,
    size: ['L', 'EX'].includes(build.size) ? build.size : null,
    ingredients,
  };
}

// ── 시작
app.get('/api/bootstrap', async (req, res) => {
  res.json({
    store: STORE,
    ai: ai.aiStatus,
    menu: (await menuList()),
    ingredients: await store.getIngredients(),
    policies: await store.getPolicies(),
    schedule: await store.getSchedule(),
    leaderboard: await store.getLeaderboard(),
    characters: (await store.getCustomers()).filter((c) => c.kind === 'easter').map((c) => ({ id: c.id, name: c.name, emoji: c.emoji, color: c.color })),
    rules: { customersPerShift: game.CUSTOMERS_PER_SHIFT, patienceSeconds: game.PATIENCE_SECONDS, maxQuestions: game.MAX_QUESTIONS },
  });
});

app.post('/api/players', async (req, res) => {
  const name = String(req.body?.name ?? '').trim().slice(0, 12);
  if (!name) fail(400, '이름을 입력해 주세요.');
  res.json({ player: await store.upsertPlayer(name) });
});

app.post('/api/shifts', async (req, res) => {
  const player = await store.getPlayer(String(req.body?.player ?? ''));
  if (!player) fail(400, '플레이어를 먼저 등록해 주세요.');
  const day = player.daysPlayed + 1;
  const plan = game.planShift(day, Boolean(req.body?.demo));
  const shiftId = await store.createShift(player.name, day, plan);
  res.json({ shift: { id: shiftId, day, total: game.CUSTOMERS_PER_SHIFT, demo: plan.demo === true } });
});

// ── 다음 손님
app.post('/api/shifts/:id/next', async (req, res) => {
  const shift = await store.getShift(Number(req.params.id));
  if (!shift || shift.status !== 'open') fail(400, '진행 중인 영업이 아니에요.');
  const orders = await store.getShiftOrders(shift.id);
  if (orders.some((o) => o.status === 'open')) fail(409, '아직 응대 중인 손님이 있어요.');
  const seq = orders.length + 1;
  if (seq > game.CUSTOMERS_PER_SHIFT) fail(400, '오늘 영업은 끝났어요.');

  const customers = await store.getCustomers();
  const states = await store.getStates(shift.player, customers);
  const list = await menuList();
  const byId = Object.fromEntries(list.map((m) => [m.id, m]));
  const plan = game.planOrder({
    seq, plan: shift.plan, customers, menuList: list,
    stateOf: (c) => states[c.id],
    usedIds: new Set(orders.map((o) => o.customer_id)),
    easterDone: orders.some((o) => o.kind === 'easter'),
    foundIds: (await store.getPlayer(shift.player))?.found ?? [],
  });

  const { customer, kind, target, speak, nuisance } = plan;
  const state = await store.getState(shift.player, customer);
  const menu = byId[target.menuId];
  const clock = game.clockFor(seq);
  const schedule = await store.getSchedule();
  const nextSchedule = schedule.find((s) => s.time >= clock) ?? null;
  const ingredients = await store.getIngredients();

  const [orderAi, rushAi] = await Promise.all([
    ai.orderLine({ customer, state, target, menu, speak, nuisance, clock, nextSchedule, ingredients }),
    nuisance?.type === 'rush' ? ai.rushLines({ customer }) : Promise.resolve(null),
  ]);

  const orderId = await store.createOrder({ shiftId: shift.id, seq, clock, customerId: customer.id, kind, target, speak, nuisance });
  await store.addLog(orderId, 'customer', orderAi.data.line);
  const newCharacter = kind === 'easter' ? await store.markFound(shift.player, customer.id) : false;

  res.json({
    order: {
      id: orderId, seq, total: game.CUSTOMERS_PER_SHIFT, clock, kind,
      customer: publicCustomer(customer),
      state: { visits: state.visits, stamps: state.stamps },
      line: orderAi.data.line,
      startEvent: nuisance?.phase === 'start' ? { type: nuisance.type } : null,
      changes: nuisance?.type === 'change' ? nuisance.changes.length : 0,
      rush: rushAi ? { lines: rushAi.data.lines, drain: nuisance.drain } : null,
      ledger: await ledgerView(shift.player, customer.id),
      newCharacter,
    },
    ai: [orderAi.trace, rushAi?.trace].filter(Boolean),
    db: {
      note: '서버가 DB의 손님·메뉴 데이터로 먼저 정한 정답입니다. AI는 이걸 말로만 바꿨어요.',
      customer: { id: customer.id, kind, memo: state.memo, visits: state.visits, stamps: state.stamps, badStreak: state.badStreak },
      target, orderText: game.describeTarget(target, menu).text, expected: game.buildExpected(target, menu), speak,
      nuisance: nuisance ? { type: nuisance.type, phase: nuisance.phase } : null,
    },
  });
});

// ── 되묻기
app.post('/api/orders/:id/ask', async (req, res) => {
  const { order } = await requireOrder(req.params.id);
  if (order.status !== 'open') fail(400, '이미 끝난 주문이에요.');
  const question = String(req.body?.question ?? '').trim().slice(0, 200);
  if (!question) fail(400, '질문을 입력해 주세요.');
  if (order.questions >= game.MAX_QUESTIONS) fail(400, '더는 물어볼 수 없어요.');

  const customer = await store.getCustomer(order.customer_id);
  const menu = (await menuById())[order.target.menuId];
  const logs = await store.getLogs(order.id);
  const { data, trace } = await ai.answerQuestion({ customer, target: order.target, menu, logs, question, nuisance: order.nuisance, ingredients: await store.getIngredients() });

  await store.addLog(order.id, 'barista', question);
  await store.addLog(order.id, 'customer', data.answer);
  await store.updateOrder(order.id, { questions: order.questions + 1 });
  res.json({ answer: data.answer, questionsLeft: game.MAX_QUESTIONS - order.questions - 1, ai: [trace] });
});

// ── 제조 중 이벤트 (말 바꾸기 진상)
app.post('/api/orders/:id/event', async (req, res) => {
  const { order } = await requireOrder(req.params.id);
  const n = order.nuisance;
  if (order.status !== 'open' || n?.type !== 'change' || n.applied >= n.changes.length) fail(400, '발생할 이벤트가 없어요.');
  const change = n.changes[n.applied];
  const customer = await store.getCustomer(order.customer_id);
  const menu = (await menuById())[change.target.menuId];
  const { data, trace } = await ai.nuisanceLine({ customer, type: 'change', data: change, target: change.target, menu, ingredients: await store.getIngredients() });

  await store.addLog(order.id, 'customer', data.line);
  await store.updateOrder(order.id, { target: change.target, nuisance: { ...n, applied: n.applied + 1 } });
  res.json({
    line: data.line, remaining: n.changes.length - n.applied - 1, ai: [trace],
    db: { note: '서버가 미리 정해 둔 변경 내용으로 정답을 바꿨어요.', change: change.text, target: change.target, expected: game.buildExpected(change.target, menu) },
  });
});

// ── 진상 응대 근거 자료
app.get('/api/orders/:id/evidence', async (req, res) => {
  const { order, shift } = await requireOrder(req.params.id);
  const customer = await store.getCustomer(order.customer_id);
  const state = await store.getState(shift.player, customer);
  const menu = (await menuById())[order.target.menuId];
  res.json({
    logs: await store.getLogs(order.id),
    ledger: {
      visits: state.visits, stamps: state.stamps, stampGoal: await policyValue('stamp_goal'),
      thisOrder: order.status === 'open' ? null : { text: game.describeTarget(order.target, menu).text, score: order.score, mistakes: order.mistakes },
      history: await ledgerView(shift.player, customer.id),
    },
    policies: await store.getPolicies(),
  });
});

// ── 서빙
app.post('/api/orders/:id/serve', async (req, res) => {
  const { order, shift } = await requireOrder(req.params.id);
  if (order.status !== 'open') fail(400, '이미 서빙한 주문이에요.');
  const n = order.nuisance;
  if (n?.phase === 'start' && !n.resolved) fail(400, '먼저 손님 요구에 응대해 주세요.');

  const left = Boolean(req.body?.left);
  const patience = Math.max(0, Math.min(1, Number(req.body?.patience) || 0));
  const waste = Math.max(0, Math.min(10, Math.floor(Number(req.body?.waste) || 0)));
  const build = await sanitizeBuild(req.body?.build);

  const customer = await store.getCustomer(order.customer_id);
  const state = await store.getState(shift.player, customer);
  const menu = (await menuById())[order.target.menuId];
  const ingredients = await store.getIngredients();
  const expected = game.buildExpected(order.target, menu);

  const scored = left ? { score: 0, mistakes: ['손님이 기다리다 떠났어요'] } : game.scoreDrink(expected, build, ingredients, waste);
  const grade = left ? '떠남' : game.gradeOf(scored.score);
  const price = game.priceOf(order.target, menu);
  const sales = !left && scored.score >= 50 ? price : 0;
  let tip = !left && scored.score >= 80 ? Math.round((patience * 500) / 10) * 10 : 0;
  if (order.kind === 'easter') tip *= 2;
  const result = { score: scored.score, grade, mistakes: scored.mistakes, left, expected, made: build, sales, tip, price };

  const traces = [];
  const reactAi = await ai.react({ customer, state, target: order.target, menu, result, clock: order.clock, nuisance: n, ingredients });
  traces.push(reactAi.trace);
  await store.addLog(order.id, 'customer', reactAi.data.line);

  // 진상 등급 (음료로 판정하는 유형)
  let nuisanceGrade = null;
  let nuisancePoints = 0;
  if (n?.type === 'change' || n?.type === 'rush') {
    nuisanceGrade = left ? 'C' : game.gradeByDrink(scored.score, patience);
    nuisancePoints = game.NUISANCE_BONUS[nuisanceGrade];
  }

  // 서빙 후 진상 이벤트 (우기기, 환불)
  let followUp = null;
  let nextNuisance = n;
  if (!left && (n?.type === 'insist' || n?.type === 'refund')) {
    let data;
    if (n.type === 'insist') {
      const sizeWrong = build?.size && build.size !== expected.size;
      const tempWrong = build?.cup && build.cup !== expected.cup;
      const label = { ICED: '아이스', HOT: '따뜻한 거', L: 'L 사이즈', EX: 'EX 사이즈' };
      if (tempWrong) data = { field: 'temp', claimReal: true, claimText: label[expected.cup] };
      else if (sizeWrong) data = { field: 'size', claimReal: true, claimText: label[expected.size] };
      else if (menu.temps.length > 1 && game.rand() < 0.5) data = { field: 'temp', claimReal: false, claimText: label[expected.cup === 'HOT' ? 'ICED' : 'HOT'] };
      else data = { field: 'size', claimReal: false, claimText: label[expected.size === 'L' ? 'EX' : 'L'] };
      data.storeMistake = data.claimReal;
    } else {
      data = { storeMistake: scored.score < 100 };
    }
    const lineAi = await ai.nuisanceLine({ customer, type: n.type, data, target: order.target, menu, ingredients });
    traces.push(lineAi.trace);
    await store.addLog(order.id, 'customer', lineAi.data.line);
    nextNuisance = { ...n, pending: data };
    followUp = { type: n.type, line: lineAi.data.line };
  }

  // 단골 기억 갱신
  const newState = {
    visits: state.visits + 1,
    stamps: left ? state.stamps : state.stamps + 1,
    memo: reactAi.data.memo,
    badStreak: customer.kind === 'regular' && !n?.grumpy ? (scored.score < 50 ? state.badStreak + 1 : 0) : 0,
    lastOrder: order.target,
  };
  await store.saveState(shift.player, customer.id, newState);

  const easterBonus = order.kind === 'easter' && scored.score >= 50 ? 20 : 0;
  await store.updateOrder(order.id, {
    status: left ? 'left' : 'served', build, score: scored.score, mistakes: scored.mistakes, reaction: reactAi.data.line,
    sales, tip, waste, nuisance: nextNuisance, nuisance_grade: nuisanceGrade, nuisance_points: nuisancePoints,
  });
  await store.updateShiftTotals(shift.id, { score: scored.score + nuisancePoints + easterBonus, sales, tips: tip });

  res.json({
    result, line: reactAi.data.line, followUp, nuisanceGrade, nuisancePoints, easterBonus, ai: traces,
    db: {
      note: '채점·매출·팁은 서버 규칙으로 계산했고, AI는 결과에 맞는 반응과 메모만 썼어요.',
      expected, made: build, scoring: '온도 -25 / 사이즈 -10 / 재료 1개 차이당 -12(재료당 최대 -24) / 버린 음료 -5',
      stateBefore: state, stateAfter: newState, followUpFacts: followUp ? nextNuisance.pending : null,
    },
  });
});

// ── 진상 응대 (시작 전 요구 / 서빙 후 항의)
app.post('/api/orders/:id/respond', async (req, res) => {
  const { order, shift } = await requireOrder(req.params.id);
  const n = order.nuisance;
  const phase = n?.phase;
  const pendingStart = phase === 'start' && !n.resolved && order.status === 'open';
  const pendingAfter = phase === 'after' && n.pending && !n.resolved;
  if (!pendingStart && !pendingAfter) fail(400, '응대할 요구가 없어요.');

  const reply = String(req.body?.reply ?? '').trim().slice(0, 300);
  if (!reply) fail(400, '응대할 말을 입력해 주세요.');
  const checked = Array.isArray(req.body?.checked) ? req.body.checked.map(String) : [];

  const customer = await store.getCustomer(order.customer_id);
  const state = await store.getState(shift.player, customer);
  const menu = (await menuById())[order.target.menuId];
  const stampGoal = await policyValue('stamp_goal');
  const maxShots = await policyValue('max_shots');

  const facts = { storeMistake: Boolean(n.pending?.storeMistake), stamps: state.stamps, visits: state.visits, stampGoal, maxShots };
  const situations = {
    fake_regular: `손님이 자기가 매일 오는 단골이라며 무료 사이즈업(L→EX)을 요구함. 매장 규정: 사이즈업은 700원 유료, 스탬프 ${stampGoal}개면 음료 1잔 무료.`,
    unreasonable: `손님이 아메리카노에 샷 ${n.requestedShots}개를 요구함. 매장 규정: 샷은 음료 1잔에 최대 ${maxShots}개.`,
    insist: `손님이 "${n.pending?.claimText}"라고 주문했다고 항의함. 매장 규정: 무료 재제조는 매장 실수일 때만.`,
    refund: '손님이 반쯤 마신 음료가 맛이 이상하다며 환불을 요구함. 매장 규정: 환불은 제조 전 취소 또는 매장 실수일 때만.',
  };

  const extractAi = await ai.extractReply({ type: n.type, situation: situations[n.type], reply });
  const judge = game.judgeResponse(n.type, facts, extractAi.data, checked);
  const replyAi = await ai.nuisanceReply({ customer, type: n.type, reply, judge });

  await store.addLog(order.id, 'barista', reply);
  await store.addLog(order.id, 'customer', replyAi.data.line);

  const bonus = game.NUISANCE_BONUS[judge.grade] - 20 * judge.violations.length;
  let losses = 0;
  const effects = [];
  let target = order.target;
  const acts = extractAi.data.promised_actions ?? [];

  if (n.type === 'fake_regular' && acts.includes('free_size_up')) {
    target = { ...target, size: 'EX' };
    losses += 700;
    effects.push('무료 사이즈업 약속 → 주문이 EX로 바뀌고 700원 손실');
  }
  if (n.type === 'unreasonable') {
    if (acts.includes('over_limit_shots')) {
      target = { ...target, extraShots: n.requestedShots - 2 };
      effects.push(`샷 ${n.requestedShots}개 제조 약속 → 규정 위반`);
    } else {
      effects.push(`샷 ${maxShots}개 아메리카노로 제조`);
    }
  }
  if (pendingAfter) {
    if (acts.includes('refund')) { losses += order.sales; effects.push(`환불 처리 → 매출 ${order.sales}원 차감`); }
    if (acts.includes('free_remake') && !facts.storeMistake) { losses += game.priceOf(order.target, menu); effects.push('불필요한 무료 재제조 → 음료 원가 손실'); }
    if (acts.includes('free_remake') && facts.storeMistake) effects.push('매장 실수라서 무료 재제조가 맞는 조치예요');
  }

  // 규정을 어기고 들어준 경우 손님은 만족해서 남는다 (대신 손실과 감점)
  const leave = judge.grade === 'C' && judge.violations.length === 0;
  if (leave) effects.push('손님이 화가 나서 떠났어요');

  const updates = { nuisance: { ...n, resolved: true }, nuisance_grade: judge.grade, nuisance_points: (order.nuisance_points ?? 0) + bonus, target };
  if (pendingStart && leave) Object.assign(updates, { status: 'left', score: 0, mistakes: ['진상 응대 실패로 손님이 떠났어요'], reaction: replyAi.data.line });
  await store.updateOrder(order.id, updates);
  await store.updateShiftTotals(shift.id, { score: bonus, losses });
  await store.addNuisanceEvent({ orderId: order.id, type: n.type, phase, payload: facts, reply, extracted: extractAi.data, violations: judge.violations, grade: judge.grade, points: bonus });

  res.json({
    judge: { ...judge, bonus, losses, effects }, line: replyAi.data.line, leave: pendingStart && leave,
    ai: [extractAi.trace, replyAi.trace],
    db: {
      note: 'AI는 답변에서 사실만 뽑았고, 등급은 서버가 DB의 매장 규정·기록과 대조해 매겼어요.',
      facts, extracted: extractAi.data, checkedEvidence: checked, judge,
    },
  });
});

// ── 마감
app.post('/api/shifts/:id/end', async (req, res) => {
  const shift = await store.getShift(Number(req.params.id));
  if (!shift) fail(404, '영업을 찾을 수 없어요.');
  if (shift.status === 'closed') return res.json({ report: shift.report, stats: shift.report?.stats, leaderboard: await store.getLeaderboard() });

  const byId = (await menuById());
  const orders = (await store.getShiftOrders(shift.id)).filter((o) => o.status !== 'open');
  const customers = Object.fromEntries((await store.getCustomers()).map((c) => [c.id, c]));
  const starsOf = (o) => (o.status === 'left' ? 1 : o.score >= 100 ? 5 : o.score >= 80 ? 4 : o.score >= 50 ? 3 : 2);

  const mistakeCount = {};
  orders.flatMap((o) => o.mistakes ?? []).forEach((m) => {
    const key = m.split(/[:(]/)[0].replace(/\d+번.*/, '').trim();
    mistakeCount[key] = (mistakeCount[key] ?? 0) + 1;
  });
  const topMistake = Object.entries(mistakeCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const fresh = await store.getShift(shift.id);
  const stats = {
    totalScore: fresh.total_score, sales: fresh.sales, tips: fresh.tips, losses: fresh.losses,
    avgScore: orders.length ? Math.round(orders.reduce((s, o) => s + (o.score ?? 0), 0) / orders.length) : 0,
    perfect: orders.filter((o) => o.score === 100).length,
    questions: orders.reduce((s, o) => s + o.questions, 0),
    served: orders.length,
    easter: orders.filter((o) => o.kind === 'easter').map((o) => customers[o.customer_id].name).join(', '),
    topMistake,
  };
  const kindLabel = { regular: '일반', nuisance: '진상', easter: '이스터에그' };
  const summaries = orders.map((o) => ({
    clock: o.clock, customerId: o.customer_id, customerName: customers[o.customer_id].name, kindLabel: kindLabel[o.kind],
    orderText: game.describeTarget(o.target, byId[o.target.menuId]).text, score: o.score ?? 0, stars: starsOf(o),
    mistakes: o.mistakes ?? [], nuisance: o.nuisance_grade,
    offlineLine: game.pick(starsOf(o) >= 4 ? customers[o.customer_id].offline.good : customers[o.customer_id].offline.bad),
  }));

  const { data, trace } = await ai.dayReport({ player: shift.player, day: shift.day, stats, orders: summaries });
  const reviewText = Object.fromEntries((data.reviews ?? []).map((r) => [r.customer_id, r.text]));
  const reviews = summaries.map((s) => ({
    customerId: s.customerId, name: s.customerName, stars: s.stars,
    text: reviewText[s.customerId] ?? (s.stars >= 4 ? '잘 마셨어요!' : '다음엔 제대로 부탁해요.'),
  }));
  for (const r of reviews) await store.addReview(shift.id, r.customerId, r.stars, r.text);

  const report = { headline: data.headline, comment: data.comment, advice: data.advice, reviews, stats };
  await store.closeShift(shift.id, report);
  res.json({ report, stats, leaderboard: await store.getLeaderboard(), player: await store.getPlayer(shift.player), ai: [trace] });
});

app.get('/api/leaderboard', async (req, res) => res.json({ leaderboard: await store.getLeaderboard() }));

app.use('/api', (req, res) => res.status(404).json({ error: '없는 API예요.' }));
app.use((err, req, res, next) => {
  if (err instanceof GameError) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: '서버 오류가 발생했어요.' });
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`☕ EBS 이디야 바리스타 → http://localhost:${PORT}`);
    console.log(ai.aiStatus.enabled ? `   AI 연결됨 (${ai.aiStatus.model})` : '   AI 키 없음 → 오프라인(템플릿 대사) 모드');
  });
}

export default app;
