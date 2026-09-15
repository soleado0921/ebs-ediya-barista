// 데이터 저장소.
// - DATABASE_URL이 있으면 Neon Postgres (Vercel 배포용)
// - 없으면 로컬 SQLite 파일 data/cafe.db (내장 node:sqlite)
// SQL은 Postgres 문법($1 자리표시자)으로 쓰고, SQLite에서는 필요한 부분만 바꿔 실행한다.
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { INGREDIENTS, MENU, POLICIES, SCHEDULE, CUSTOMERS } from './content.js';

const j = (v) => JSON.stringify(v ?? null);
const parse = (s) => (s == null ? null : JSON.parse(s));
export const now = () => new Date().toISOString();

// ── 드라이버
let driver;

async function createDriver() {
  if (process.env.DATABASE_URL) {
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    return { kind: 'postgres', query: (text, params = []) => sql.query(text, params) };
  }
  const { DatabaseSync } = await import('node:sqlite');
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  fs.mkdirSync(path.join(root, 'data'), { recursive: true });
  const db = new DatabaseSync(path.join(root, 'data', 'cafe.db'));
  db.exec('PRAGMA journal_mode = WAL;');
  const toSqlite = (text) => text.replace(/\$(\d+)/g, '?$1').replace(/GREATEST\(/g, 'MAX(');
  return {
    kind: 'sqlite',
    query: async (text, params = []) => db.prepare(toSqlite(text)).all(...params).map((r) => ({ ...r })),
  };
}

const q = (text, params) => driver.query(text, params);
const one = async (text, params) => (await q(text, params))[0] ?? null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS ingredients (id TEXT PRIMARY KEY, name TEXT, short TEXT, grp TEXT, color TEXT, sort INTEGER);
CREATE TABLE IF NOT EXISTS menu (
  id TEXT PRIMARY KEY, name TEXT, category TEXT, price INTEGER, temps TEXT, base TEXT,
  sweet_key TEXT, is_coffee INTEGER, has_milk INTEGER, whip_allowed INTEGER, whip_default INTEGER, hint TEXT, sort INTEGER
);
CREATE TABLE IF NOT EXISTS policies (key TEXT PRIMARY KEY, value TEXT, title TEXT, text TEXT, sort INTEGER);
CREATE TABLE IF NOT EXISTS schedule (time TEXT PRIMARY KEY, title TEXT, place TEXT);
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY, kind TEXT, nuisance_type TEXT, name TEXT, job TEXT, personality TEXT, speech TEXT,
  favorites TEXT, prefs TEXT, avatar TEXT, emoji TEXT, color TEXT, no_coffee INTEGER, start_state TEXT, offline TEXT
);
CREATE TABLE IF NOT EXISTS players (name TEXT PRIMARY KEY, created_at TEXT, days_played INTEGER DEFAULT 0, best_total INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS customer_state (
  player TEXT, customer_id TEXT, visits INTEGER DEFAULT 0, stamps INTEGER DEFAULT 0, memo TEXT DEFAULT '',
  bad_streak INTEGER DEFAULT 0, last_order TEXT, PRIMARY KEY (player, customer_id)
);
CREATE TABLE IF NOT EXISTS found_characters (player TEXT, customer_id TEXT, found_at TEXT, PRIMARY KEY (player, customer_id));
CREATE TABLE IF NOT EXISTS shifts (
  id SERIAL PRIMARY KEY, player TEXT, day INTEGER, plan TEXT, started_at TEXT, ended_at TEXT, status TEXT DEFAULT 'open',
  total_score INTEGER DEFAULT 0, sales INTEGER DEFAULT 0, tips INTEGER DEFAULT 0, losses INTEGER DEFAULT 0, report TEXT
);
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY, shift_id INTEGER, seq INTEGER, clock TEXT, customer_id TEXT, kind TEXT,
  target_initial TEXT, target TEXT, speak TEXT, nuisance TEXT, questions INTEGER DEFAULT 0, build TEXT, score INTEGER,
  mistakes TEXT, reaction TEXT, sales INTEGER DEFAULT 0, tip INTEGER DEFAULT 0, waste INTEGER DEFAULT 0,
  nuisance_grade TEXT, nuisance_points INTEGER DEFAULT 0, status TEXT DEFAULT 'open', created_at TEXT
);
CREATE TABLE IF NOT EXISTS dialog_logs (id SERIAL PRIMARY KEY, order_id INTEGER, speaker TEXT, text TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS nuisance_events (
  id SERIAL PRIMARY KEY, order_id INTEGER, type TEXT, phase TEXT, payload TEXT, player_reply TEXT,
  extracted TEXT, violations TEXT, grade TEXT, points INTEGER, created_at TEXT
);
CREATE TABLE IF NOT EXISTS reviews (id SERIAL PRIMARY KEY, shift_id INTEGER, customer_id TEXT, stars INTEGER, text TEXT);
`;

async function migrate() {
  const statements = SCHEMA.split(';').map((s) => s.trim()).filter(Boolean);
  for (const s of statements) {
    await q(driver.kind === 'sqlite' ? s.replace(/id SERIAL PRIMARY KEY/g, 'id INTEGER PRIMARY KEY AUTOINCREMENT') : s);
  }
}

// 콘텐츠(content.js)가 바뀌었을 때만 다시 시드한다. 서버리스 콜드 스타트마다 수십 번 쓰지 않기 위해서.
async function seed() {
  const hash = crypto.createHash('sha1').update(JSON.stringify([INGREDIENTS, MENU, POLICIES, SCHEDULE, CUSTOMERS])).digest('hex');
  const current = await one("SELECT value FROM meta WHERE key = 'content_hash'");
  if (current?.value === hash) return;

  const upsert = (table, cols, key) => `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})
    ON CONFLICT (${key}) DO UPDATE SET ${cols.filter((c) => c !== key).map((c) => `${c} = EXCLUDED.${c}`).join(', ')}`;

  for (const [i, x] of INGREDIENTS.entries()) {
    await q(upsert('ingredients', ['id', 'name', 'short', 'grp', 'color', 'sort'], 'id'), [x.id, x.name, x.short, x.group, x.color, i]);
  }
  for (const [i, m] of MENU.entries()) {
    await q(upsert('menu', ['id', 'name', 'category', 'price', 'temps', 'base', 'sweet_key', 'is_coffee', 'has_milk', 'whip_allowed', 'whip_default', 'hint', 'sort'], 'id'), [
      m.id, m.name, m.category, m.price, j(m.temps), j(m.base), m.sweet, m.coffee ? 1 : 0, m.milk ? 1 : 0,
      m.whip ? 1 : 0, (m.whipDefault ?? (m.base.whip > 0)) ? 1 : 0, m.hint, i,
    ]);
  }
  for (const [i, p] of POLICIES.entries()) {
    await q(upsert('policies', ['key', 'value', 'title', 'text', 'sort'], 'key'), [p.key, String(p.value), p.title, p.text, i]);
  }
  for (const s of SCHEDULE) {
    await q(upsert('schedule', ['time', 'title', 'place'], 'time'), [s.time, s.title, s.place]);
  }
  for (const c of CUSTOMERS) {
    await q(upsert('customers', ['id', 'kind', 'nuisance_type', 'name', 'job', 'personality', 'speech', 'favorites', 'prefs', 'avatar', 'emoji', 'color', 'no_coffee', 'start_state', 'offline'], 'id'), [
      c.id, c.kind, c.nuisance ?? null, c.name, c.job, c.personality, c.speech, j(c.favorites), j(c.prefs),
      j(c.avatar ?? null), c.emoji ?? null, c.color ?? null, c.noCoffee ? 1 : 0, j(c.startState ?? null),
      j({ ...c.offline, rush: c.rushOffline ?? null }),
    ]);
  }
  await q(upsert('meta', ['key', 'value'], 'key'), ['content_hash', hash]);
}

// 모든 조회 전에 await ready 해야 한다.
export const ready = (async () => {
  driver = await createDriver();
  await migrate();
  await seed();
  console.log(`   DB: ${driver.kind === 'postgres' ? 'Neon Postgres' : 'SQLite (data/cafe.db)'}`);
})();

// ── 정적 콘텐츠 조회 (자주 쓰므로 인스턴스 메모리에 캐시)
const cache = {};
const cached = async (key, load) => (cache[key] ??= await load());

export const getIngredients = () => cached('ingredients', async () => (await q('SELECT * FROM ingredients ORDER BY sort'))
  .map((r) => ({ id: r.id, name: r.name, short: r.short, group: r.grp, color: r.color })));

export const getMenu = () => cached('menu', async () => (await q('SELECT * FROM menu ORDER BY sort')).map((r) => ({
  id: r.id, name: r.name, category: r.category, price: r.price, temps: parse(r.temps), base: parse(r.base),
  sweetKey: r.sweet_key, isCoffee: !!r.is_coffee, hasMilk: !!r.has_milk,
  whipAllowed: !!r.whip_allowed, whipDefault: !!r.whip_default, hint: r.hint,
})));

export const getPolicies = () => cached('policies', async () => (await q('SELECT * FROM policies ORDER BY sort'))
  .map((r) => ({ key: r.key, value: isNaN(Number(r.value)) ? r.value : Number(r.value), title: r.title, text: r.text })));

export const getSchedule = () => cached('schedule', () => q('SELECT * FROM schedule ORDER BY time'));

function rowToCustomer(r) {
  return {
    id: r.id, kind: r.kind, nuisanceType: r.nuisance_type, name: r.name, job: r.job,
    personality: r.personality, speech: r.speech, favorites: parse(r.favorites), prefs: parse(r.prefs) ?? {},
    avatar: parse(r.avatar), emoji: r.emoji, color: r.color, noCoffee: !!r.no_coffee,
    startState: parse(r.start_state), offline: parse(r.offline),
  };
}

export const getCustomers = () => cached('customers', async () => (await q('SELECT * FROM customers')).map(rowToCustomer));

export async function getCustomer(id) {
  return (await getCustomers()).find((c) => c.id === id) ?? null;
}

// ── 플레이어
export async function upsertPlayer(name) {
  await q('INSERT INTO players (name, created_at) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING', [name, now()]);
  return getPlayer(name);
}

export async function getPlayer(name) {
  const p = await one('SELECT * FROM players WHERE name = $1', [name]);
  if (!p) return null;
  const found = (await q('SELECT customer_id FROM found_characters WHERE player = $1', [name])).map((r) => r.customer_id);
  return { name: p.name, daysPlayed: p.days_played, bestTotal: p.best_total, found };
}

export async function markFound(player, customerId) {
  const rows = await q('INSERT INTO found_characters (player, customer_id, found_at) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING customer_id', [player, customerId, now()]);
  return rows.length > 0;
}

// ── 손님 상태 (플레이어별 단골 기억)
export async function getState(player, customer) {
  const s = customer.startState ?? {};
  await q('INSERT INTO customer_state (player, customer_id, visits, stamps) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
    [player, customer.id, s.visits ?? 0, s.stamps ?? 0]);
  const r = await one('SELECT * FROM customer_state WHERE player = $1 AND customer_id = $2', [player, customer.id]);
  return { visits: r.visits, stamps: r.stamps, memo: r.memo, badStreak: r.bad_streak, lastOrder: parse(r.last_order) };
}

export async function getStates(player, customers) {
  const entries = await Promise.all(customers.map(async (c) => [c.id, await getState(player, c)]));
  return Object.fromEntries(entries);
}

export async function saveState(player, customerId, s) {
  await q(`UPDATE customer_state SET visits = $1, stamps = $2, memo = $3, bad_streak = $4, last_order = $5
    WHERE player = $6 AND customer_id = $7`, [s.visits, s.stamps, s.memo ?? '', s.badStreak, j(s.lastOrder), player, customerId]);
}

export async function getLedger(player, customerId, limit = 5) {
  const rows = await q(`SELECT o.id, o.target, o.score, o.clock, s.day FROM orders o JOIN shifts s ON s.id = o.shift_id
    WHERE s.player = $1 AND o.customer_id = $2 AND o.status IN ('served','left') ORDER BY o.id DESC LIMIT $3`, [player, customerId, limit]);
  return rows.map((r) => ({ orderId: r.id, target: parse(r.target), score: r.score, clock: r.clock, day: r.day }));
}

// ── 영업(시프트)
export async function createShift(player, day, plan) {
  const r = await one('INSERT INTO shifts (player, day, plan, started_at) VALUES ($1, $2, $3, $4) RETURNING id', [player, day, j(plan), now()]);
  return Number(r.id);
}

export async function getShift(id) {
  const r = await one('SELECT * FROM shifts WHERE id = $1', [id]);
  return r ? { ...r, plan: parse(r.plan), report: parse(r.report) } : null;
}

export async function updateShiftTotals(id, { score = 0, sales = 0, tips = 0, losses = 0 }) {
  await q('UPDATE shifts SET total_score = total_score + $1, sales = sales + $2, tips = tips + $3, losses = losses + $4 WHERE id = $5',
    [score, sales, tips, losses, id]);
}

export async function closeShift(id, report) {
  await q("UPDATE shifts SET status = 'closed', ended_at = $1, report = $2 WHERE id = $3", [now(), j(report), id]);
  const s = await getShift(id);
  await q('UPDATE players SET days_played = GREATEST(days_played, $1), best_total = GREATEST(best_total, $2) WHERE name = $3',
    [s.day, s.total_score, s.player]);
  return s;
}

export async function getLeaderboard(limit = 10) {
  return q(`SELECT player, day, total_score, sales + tips - losses AS money, ended_at FROM shifts
    WHERE status = 'closed' ORDER BY total_score DESC, money DESC LIMIT $1`, [limit]);
}

// ── 주문
export async function createOrder(o) {
  const r = await one(`INSERT INTO orders (shift_id, seq, clock, customer_id, kind, target_initial, target, speak, nuisance, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
  [o.shiftId, o.seq, o.clock, o.customerId, o.kind, j(o.target), j(o.target), j(o.speak), j(o.nuisance), now()]);
  return Number(r.id);
}

const rowToOrder = (r) => ({
  ...r, target_initial: parse(r.target_initial), target: parse(r.target), speak: parse(r.speak),
  nuisance: parse(r.nuisance), build: parse(r.build), mistakes: parse(r.mistakes),
});

export async function getOrder(id) {
  const r = await one('SELECT * FROM orders WHERE id = $1', [id]);
  return r ? rowToOrder(r) : null;
}

export async function getShiftOrders(shiftId) {
  return (await q('SELECT * FROM orders WHERE shift_id = $1 ORDER BY seq', [shiftId])).map(rowToOrder);
}

const ORDER_COLUMNS = new Set(['target', 'questions', 'build', 'score', 'mistakes', 'reaction', 'sales', 'tip', 'waste', 'nuisance', 'nuisance_grade', 'nuisance_points', 'status']);

export async function updateOrder(id, fields) {
  const cols = Object.keys(fields).filter((c) => ORDER_COLUMNS.has(c));
  const vals = cols.map((c) => (typeof fields[c] === 'object' && fields[c] !== null ? j(fields[c]) : fields[c]));
  await q(`UPDATE orders SET ${cols.map((c, i) => `${c} = $${i + 1}`).join(', ')} WHERE id = $${cols.length + 1}`, [...vals, id]);
}

export async function addLog(orderId, speaker, text) {
  await q('INSERT INTO dialog_logs (order_id, speaker, text, created_at) VALUES ($1, $2, $3, $4)', [orderId, speaker, text, now()]);
}

export async function getLogs(orderId) {
  return q('SELECT speaker, text, created_at FROM dialog_logs WHERE order_id = $1 ORDER BY id', [orderId]);
}

export async function addNuisanceEvent(e) {
  await q(`INSERT INTO nuisance_events (order_id, type, phase, payload, player_reply, extracted, violations, grade, points, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
  [e.orderId, e.type, e.phase, j(e.payload), e.reply ?? null, j(e.extracted), j(e.violations), e.grade ?? null, e.points ?? 0, now()]);
}

export async function addReview(shiftId, customerId, stars, text) {
  await q('INSERT INTO reviews (shift_id, customer_id, stars, text) VALUES ($1, $2, $3, $4)', [shiftId, customerId, stars, text]);
}
