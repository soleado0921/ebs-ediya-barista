// 게임 규칙: 주문 정답 만들기, 레시피 계산, 채점, 진상 응대 판정.
// 모두 결정적인 서버 로직이며 AI는 여기에 관여하지 않는다.

export const CUSTOMERS_PER_SHIFT = 7;
export const PATIENCE_SECONDS = 70;
export const MAX_QUESTIONS = 3;

const OPEN_CLOCK = 8 * 60 + 30; // 08:30 개점 후 첫 손님
const CLOCK_STEP = 30;

export const rand = Math.random;
export const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const chance = (p) => rand() < p;
const weighted = (pairs) => {
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [v, w] of pairs) { if ((r -= w) < 0) return v; }
  return pairs[pairs.length - 1][0];
};

export function clockFor(seq) {
  const t = OPEN_CLOCK + (seq - 1) * CLOCK_STEP;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

// ── 레시피
export function buildExpected(target, menu) {
  const ing = { ...menu.base };
  if (target.temp === 'ICED') ing.ice = 1;
  if (menu.isCoffee && target.extraShots > 0) ing.shot = (ing.shot ?? 0) + target.extraShots;
  if (menu.sweetKey && target.sweet !== 'normal') {
    ing[menu.sweetKey] = Math.max(1, ing[menu.sweetKey] + (target.sweet === 'less' ? -1 : 1));
  }
  if (menu.hasMilk && target.milk && target.milk !== 'milk') {
    ing[target.milk] = ing.milk;
    delete ing.milk;
  }
  if (menu.whipAllowed) {
    if (target.whip) ing.whip = 1;
    else delete ing.whip;
  }
  return { cup: target.temp, size: target.size, ingredients: ing };
}

export const TEMP_LABEL = { HOT: 'HOT', ICED: 'ICED' };
const MILK_LABEL = { oat: '오트밀크로 변경', soy: '두유로 변경' };

export function describeTarget(target, menu) {
  const options = [];
  if (target.extraShots > 0) options.push(`샷 ${target.extraShots}번 추가`);
  if (target.sweet === 'less') options.push('덜 달게');
  if (target.sweet === 'more') options.push('더 달게');
  if (MILK_LABEL[target.milk]) options.push(MILK_LABEL[target.milk]);
  if (menu.whipAllowed && target.whip !== menu.whipDefault) options.push(target.whip ? '휘핑 추가' : '휘핑 빼기');
  return {
    menu: menu.name, temp: target.temp, size: target.size, options,
    text: `(${target.size}) ${target.temp} ${menu.name}${options.length ? ` · ${options.join(', ')}` : ''}`,
  };
}

// ── 채점 (PRD 6.1)
export function scoreDrink(expected, build, ingredients, waste = 0) {
  const name = Object.fromEntries(ingredients.map((i) => [i.id, i.name]));
  const mistakes = [];
  if (!build || !build.cup) {
    return { score: 0, mistakes: ['컵을 고르지 않고 서빙했어요'] };
  }
  let deduction = 0;
  if (build.cup !== expected.cup) {
    deduction += 25;
    mistakes.push(`온도: ${expected.cup} 주문인데 ${build.cup}로 만들었어요`);
  }
  if (build.size !== expected.size) {
    deduction += 10;
    mistakes.push(`사이즈: ${expected.size} 주문인데 ${build.size} 컵을 썼어요`);
  }
  const made = build.ingredients ?? {};
  const keys = new Set([...Object.keys(expected.ingredients), ...Object.keys(made)]);
  for (const k of keys) {
    const want = expected.ingredients[k] ?? 0;
    const got = made[k] ?? 0;
    if (want === got) continue;
    const diff = got - want;
    deduction += Math.min(24, 12 * Math.abs(diff));
    if (want === 0) mistakes.push(`주문에 없는 재료: ${name[k] ?? k} ${got}번`);
    else if (diff < 0) mistakes.push(`${name[k] ?? k} ${-diff}번 부족 (정답 ${want})`);
    else mistakes.push(`${name[k] ?? k} ${diff}번 초과 (정답 ${want})`);
  }
  if (waste > 0) {
    deduction += 5 * waste;
    mistakes.push(`버린 음료 ${waste}잔`);
  }
  return { score: Math.max(0, 100 - deduction), mistakes };
}

export function gradeOf(score) {
  if (score >= 100) return '완벽';
  if (score >= 80) return '좋음';
  if (score >= 50) return '아쉬움';
  return '실패';
}

export function priceOf(target, menu) {
  return menu.price + (target.size === 'EX' ? 700 : 0);
}

// ── 주문 정답 만들기
export function makeTarget(customer, menuList) {
  const byId = Object.fromEntries(menuList.map((m) => [m.id, m]));
  const pool = customer.noCoffee ? menuList.filter((m) => !m.isCoffee) : menuList;
  const favs = customer.favorites.map((id) => byId[id]).filter(Boolean);
  const menu = favs.length && chance(0.75) ? pick(favs) : pick(pool);
  const p = customer.prefs ?? {};

  const temp = menu.temps.length === 1 ? menu.temps[0]
    : p.temp && chance(0.8) ? p.temp : pick(menu.temps);
  const size = p.size && chance(0.75) ? p.size : chance(0.7) ? 'L' : 'EX';
  const extraShots = menu.isCoffee ? ((p.extraShot && chance(0.7)) || chance(0.1) ? 1 : 0) : 0;
  const sweet = menu.sweetKey
    ? (p.sweet && chance(0.75) ? p.sweet : weighted([['normal', 75], ['less', 15], ['more', 10]]))
    : 'normal';
  const milk = menu.hasMilk
    ? (p.milk && chance(0.75) ? p.milk : weighted([['milk', 82], ['oat', 11], ['soy', 7]]))
    : 'milk';
  const whip = menu.whipAllowed ? (menu.whipDefault ? chance(0.85) : chance(0.2)) : null;

  return { menuId: menu.id, temp, size, extraShots, sweet, milk, whip };
}

// 주문 일부를 바꾼다 (단골의 "이번엔 ~로", 말 바꾸기 진상)
export function modifyTarget(target, menuList, { allowMenuSwap = false } = {}) {
  const byId = Object.fromEntries(menuList.map((m) => [m.id, m]));
  const menu = byId[target.menuId];
  const options = [];
  if (menu.temps.length > 1) {
    const temp = target.temp === 'HOT' ? 'ICED' : 'HOT';
    options.push({ field: 'temp', patch: { temp }, text: temp === 'ICED' ? '아이스(ICED)로 변경' : '따뜻하게(HOT) 변경' });
  }
  const size = target.size === 'L' ? 'EX' : 'L';
  options.push({ field: 'size', patch: { size }, text: `사이즈 ${size}로 변경` });
  if (menu.hasMilk) {
    const milk = target.milk === 'milk' ? pick(['oat', 'soy']) : 'milk';
    options.push({ field: 'milk', patch: { milk }, text: milk === 'milk' ? '일반 우유로 변경' : MILK_LABEL[milk] });
  }
  if (menu.sweetKey) {
    const sweet = target.sweet === 'normal' ? pick(['less', 'more']) : 'normal';
    options.push({ field: 'sweet', patch: { sweet }, text: { less: '덜 달게 변경', more: '더 달게 변경', normal: '당도 기본으로 변경' }[sweet] });
  }
  if (menu.isCoffee) {
    const extraShots = target.extraShots > 0 ? 0 : 1;
    options.push({ field: 'extraShots', patch: { extraShots }, text: extraShots ? '샷 1번 추가' : '샷 추가 취소' });
  }
  if (allowMenuSwap) {
    const similar = menuList.filter((m) => m.id !== menu.id && m.isCoffee === menu.isCoffee && m.temps.includes(target.temp));
    if (similar.length) {
      const next = pick(similar);
      const t = { menuId: next.id, temp: target.temp, size: target.size, extraShots: 0, sweet: 'normal', milk: 'milk', whip: next.whipAllowed ? next.whipDefault : null };
      options.push({ field: 'menu', replace: t, text: `메뉴를 ${next.name}(으)로 변경` });
    }
  }
  const choice = pick(options);
  const newTarget = choice.replace ?? { ...target, ...choice.patch };
  return { target: newTarget, field: choice.field, text: choice.text };
}

// 하루 영업 계획: 진상 손님이 올 순서
// demo(시연 모드): 강의에서 보여주기 좋게 진상 3유형과 EBS 캐릭터가 반드시 나온다.
const DEMO_NUISANCE_CYCLE = [['change', 'insist', 'fake_regular'], ['rush', 'refund', 'unreasonable']];

export function planShift(day, demo = false) {
  if (demo) {
    return { demo: true, nuisanceSlots: [3, 5, 7], nuisanceTypes: DEMO_NUISANCE_CYCLE[(day - 1) % 2], easterSlots: [2], easterChance: 0 };
  }
  const nuisanceSlots = day <= 1
    ? [pick([4, 5, 6])]
    : [pick([3, 4]), pick([5, 6, 7])];
  return { nuisanceSlots, easterChance: 0.12 };
}

// 다음 손님과 주문 정답, 말하는 방식을 정한다.
export function planOrder({ seq, plan, customers, menuList, stateOf, usedIds, easterDone, foundIds = [] }) {
  const byId = Object.fromEntries(menuList.map((m) => [m.id, m]));
  const regulars = customers.filter((c) => c.kind === 'regular' && !usedIds.has(c.id));
  const nuisances = customers.filter((c) => c.kind === 'nuisance' && !usedIds.has(c.id));
  const easters = customers.filter((c) => c.kind === 'easter');

  let customer;
  let kind;
  let nuisance = null;

  // 3번 연속 망친 단골은 진상이 되어 돌아온다 (PRD 5.4)
  const grumpy = regulars.find((c) => stateOf(c).badStreak >= 3);

  const slot = plan.nuisanceSlots.indexOf(seq);
  if (slot >= 0 && (grumpy || nuisances.length)) {
    const wanted = plan.nuisanceTypes?.[slot];
    if (grumpy && !wanted) {
      customer = grumpy;
      nuisance = { type: pick(['insist', 'refund']), grumpy: true };
    } else {
      const pool = nuisances.filter((c) => !wanted || c.nuisanceType === wanted);
      customer = pick(pool.length ? pool : nuisances);
      nuisance = { type: customer.nuisanceType };
    }
    kind = 'nuisance';
  } else if (plan.easterSlots?.includes(seq) || (seq >= 3 && !easterDone && chance(plan.easterChance))) {
    // 도감에 아직 없는 캐릭터가 먼저 찾아온다
    const unfound = easters.filter((c) => !foundIds.includes(c.id));
    customer = pick(unfound.length ? unfound : easters);
    kind = 'easter';
  } else {
    customer = pick(regulars.length ? regulars : customers.filter((c) => c.kind === 'regular'));
    kind = 'regular';
  }

  const state = stateOf(customer);
  let target = makeTarget(customer, menuList);
  let speak = { style: 'name', omit: [], change: null };

  if (kind === 'regular' && seq >= 3) {
    const last = state.lastOrder && byId[state.lastOrder.menuId] ? state.lastOrder : null;
    if (last && chance(0.4)) {
      speak.style = 'repeat';
      target = { ...last };
      if (chance(0.5)) {
        const mod = modifyTarget(target, menuList);
        target = mod.target;
        speak.change = mod.text;
      }
    } else {
      speak.style = weighted([['name', 55], ['describe', 45]]);
      if (chance(0.6)) speak.omit = pickOmit(target, byId);
    }
  } else if (kind === 'regular' && seq === 2 && chance(0.5)) {
    speak.omit = pickOmit(target, byId).slice(0, 1);
  } else if (kind === 'easter') {
    speak.style = chance(0.5) ? 'describe' : 'name';
  }

  if (nuisance) nuisance = planNuisance(nuisance, target, menuList, customer);
  if (nuisance?.type === 'unreasonable') target = nuisance.finalTarget;
  if (nuisance?.type === 'fake_regular') target = { ...target, size: 'L' };

  return { customer, kind, target, speak, nuisance };
}

function pickOmit(target, byId) {
  const menu = byId[target.menuId];
  const fields = ['size'];
  if (menu.temps.length > 1) fields.push('temp');
  const n = chance(0.35) ? 2 : 1;
  return fields.sort(() => rand() - 0.5).slice(0, n);
}

function planNuisance(n, target, menuList, customer) {
  switch (n.type) {
    case 'change': {
      const first = modifyTarget(target, menuList, { allowMenuSwap: true });
      const changes = [first];
      if (chance(0.4)) changes.push(modifyTarget(first.target, menuList));
      return { ...n, phase: 'during', changes, applied: 0 };
    }
    case 'insist':
    case 'refund':
      return { ...n, phase: 'after' };
    case 'fake_regular':
      return { ...n, phase: 'start', demand: 'free_size_up' };
    case 'unreasonable': {
      // "샷 6개" 요구. 규정상 최대 4개로 안내하는 것이 모범 응대
      const menu = menuList.find((m) => m.id === 'americano');
      const base = { menuId: menu.id, temp: target.temp === 'HOT' ? 'HOT' : 'ICED', size: target.size, extraShots: 2, sweet: 'normal', milk: 'milk', whip: null };
      return { ...n, phase: 'start', requestedShots: 6, finalTarget: base };
    }
    case 'rush':
      return { ...n, phase: 'during', drain: 2 };
    default:
      return { ...n, phase: 'none' };
  }
}

// ── 진상 응대 판정 (PRD 5.6.1)
// extracted: AI(또는 키워드 규칙)가 플레이어 답변에서 뽑은 사실
// facts: 서버가 DB에서 확인한 사실
export const ACTIONS = ['free_remake', 'refund', 'free_size_up', 'paid_size_up', 'free_drink', 'discount', 'over_limit_shots', 'stamp_info', 'none'];

const ACTION_LABEL = {
  free_remake: '무료 재제조', refund: '환불', free_size_up: '무료 사이즈업', paid_size_up: '유료 사이즈업 안내',
  free_drink: '무료 음료', discount: '할인', over_limit_shots: '샷 한도 초과 제조', stamp_info: '스탬프 안내',
};

export const EVIDENCE_FOR = { insist: 'log', refund: 'ledger', fake_regular: 'ledger', unreasonable: 'policy' };

export function judgeResponse(type, facts, extracted, checked = []) {
  const allowed = {
    free_remake: facts.storeMistake,
    refund: facts.storeMistake,
    free_drink: facts.stamps >= facts.stampGoal,
    free_size_up: false,
    discount: false,
    over_limit_shots: false,
  };
  const actions = (extracted.promised_actions ?? []).filter((a) => a !== 'none');
  const violations = actions.filter((a) => a in allowed && !allowed[a]).map((a) => ACTION_LABEL[a]);

  let requirement = false;
  let expectation = '';
  if (type === 'insist' || type === 'refund') {
    if (facts.storeMistake) {
      requirement = extracted.apologized && (actions.includes('free_remake') || actions.includes('refund'));
      expectation = '실제로 매장 실수가 있었으니 사과하고 무료 재제조(또는 환불)를 하는 것이 모범 응대';
    } else {
      requirement = extracted.explained && !actions.includes('free_remake') && !actions.includes('refund');
      expectation = '기록상 매장 실수가 없으니 근거를 정중히 설명하고, 무료 재제조·환불 없이 대안을 안내하는 것이 모범 응대';
    }
  } else if (type === 'fake_regular') {
    requirement = extracted.explained && violations.length === 0;
    expectation = `방문 기록(스탬프 ${facts.stamps}/${facts.stampGoal})을 근거로 무료 서비스는 정중히 거절하고 스탬프 제도를 안내하는 것이 모범 응대`;
  } else if (type === 'unreasonable') {
    requirement = extracted.explained && extracted.offered_alternative && violations.length === 0;
    expectation = '샷은 최대 4개라는 규정을 설명하고 샷 4개 같은 대안을 제시하는 것이 모범 응대';
  }

  const politeness = Math.min(5, Math.max(1, Math.round(extracted.politeness ?? 3)));
  const usedEvidence = checked.includes(EVIDENCE_FOR[type]);
  let points = politeness * 10 + (requirement ? 30 : 0) + (usedEvidence ? 10 : 0) + (extracted.offered_alternative ? 10 : 0);
  points -= violations.length * 40;
  points = Math.max(0, Math.min(100, points));

  let grade = points >= 90 ? 'S' : points >= 70 ? 'A' : points >= 45 ? 'B' : 'C';
  if (politeness <= 1) grade = 'C';

  const notes = [];
  notes.push(requirement ? '핵심 대응을 제대로 했어요' : `아쉬운 점: ${expectation}`);
  if (usedEvidence) notes.push('DB 기록(근거)을 확인하고 응대했어요 +10');
  else notes.push('근거 자료를 확인하지 않았어요');
  if (violations.length) notes.push(`매장 규정 위반 약속: ${violations.join(', ')}`);

  return { grade, points, violations, requirement, politeness, usedEvidence, notes, expectation };
}

export const NUISANCE_BONUS = { S: 30, A: 15, B: 0, C: -20 };

// 말 바꾸기·재촉 진상은 음료 결과로 등급을 매긴다
export function gradeByDrink(score, patience) {
  if (score >= 100 && patience >= 0.2) return 'S';
  if (score >= 80) return 'A';
  if (score >= 50) return 'B';
  return 'C';
}
