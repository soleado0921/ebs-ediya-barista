// EBS 이디야 바리스타 - 클라이언트
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const won = (n) => `${Number(n || 0).toLocaleString('ko-KR')}원`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const S = {
  boot: null, player: null, shift: null, order: null, orderDb: null,
  build: { cup: null, size: null, ingredients: {} }, history: [], waste: 0,
  patience: 1, elapsed: 0, lastTick: 0, pauses: new Set(['idle']),
  questionsLeft: 3, changesFired: 0, lastChangeAt: 0, eventBusy: false, rushTimer: 0, rushIdx: 0,
  money: 0, score: 0, next: null, busy: false, traces: [],
};

// ── API
async function api(path, body) {
  const res = await fetch(`/api${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({ error: '서버 응답을 읽을 수 없어요.' }));
  if (!res.ok) throw new Error(data.error || '요청에 실패했어요.');
  return data;
}

function toast(msg, ms = 2200) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { t.hidden = true; }, ms);
}

const pause = (reason) => S.pauses.add(reason);
const resume = (reason) => S.pauses.delete(reason);

// ───────── 그림: 손님 아바타
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * (1 - amt))));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map(f).map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function avatarSVG(c, mood = 'neutral') {
  if (!c) return '';
  if (c.kind === 'easter') {
    return `<div class="char-avatar" style="--c:${c.color}"><div class="halo"></div><span class="spark">✦</span><span class="spark">✦</span><span class="spark">✦</span><span class="emoji">${c.emoji}</span></div>`;
  }
  const a = c.avatar;
  const hc = a.hairColor;
  const skin = a.skin;
  const acc = new Set(a.acc || []);
  const visitor = c.kind === 'nuisance' && /(외부|외주|VIP|매니저|협찬)/.test(c.job);

  const hairBack = {
    long: `<path d="M54 84 Q50 38 100 34 Q150 38 146 84 L152 176 Q128 184 100 182 Q72 184 48 176 Z" fill="${hc}"/>`,
    bob: `<path d="M54 86 Q52 38 100 34 Q148 38 146 86 L148 134 Q124 142 100 140 Q76 142 52 134 Z" fill="${hc}"/>`,
    pony: `<circle cx="148" cy="74" r="17" fill="${hc}"/><path d="M152 80 Q174 108 158 142 Q152 116 140 96Z" fill="${hc}"/>`,
  }[a.hair] || '';
  const hairFront = {
    short: `<path d="M57 88 Q52 36 100 35 Q148 36 143 88 Q137 62 114 60 Q96 70 72 62 Q62 70 57 88Z" fill="${hc}"/>`,
    long: `<path d="M57 92 Q55 38 100 37 Q145 38 143 92 Q133 60 100 58 Q68 62 57 92Z" fill="${hc}"/>`,
    bob: `<path d="M57 94 Q55 38 100 37 Q145 38 143 94 Q139 66 118 58 Q96 72 61 68 Z" fill="${hc}"/>`,
    pony: `<path d="M57 90 Q55 38 100 37 Q145 38 143 90 Q133 62 100 60 Q69 62 57 90Z" fill="${hc}"/>`,
    buzz: `<path d="M59 80 Q59 40 100 40 Q141 40 141 80 Q127 58 100 58 Q73 58 59 80Z" fill="${hc}" opacity=".8"/>`,
    messy: `<path d="M55 88 L58 52 L71 60 L77 36 L91 52 L100 30 L111 50 L124 34 L129 56 L143 50 L145 88 Q133 64 100 62 Q69 64 55 88Z" fill="${hc}"/>`,
    bald: `<path d="M58 96 Q56 74 63 68 L66 98Z M142 96 Q144 74 137 68 L134 98Z" fill="${hc}"/>`,
  }[a.hair] || '';

  const brows = mood === 'angry'
    ? `<path d="M74 76 L92 82 M126 76 L108 82" stroke="${shade(hc, .1)}" stroke-width="4" stroke-linecap="round"/>`
    : mood === 'sad'
      ? `<path d="M74 80 L92 76 M126 80 L108 76" stroke="${shade(hc, .1)}" stroke-width="4" stroke-linecap="round"/>`
      : `<path d="M74 78 Q83 73 92 78 M108 78 Q117 73 126 78" stroke="${shade(hc, .1)}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
  const mouth = {
    happy: '<path d="M86 116 Q100 132 114 116 Z" fill="#b6444a"/>',
    neutral: '<path d="M89 119 Q100 124 111 119" stroke="#8a4a44" stroke-width="3" fill="none" stroke-linecap="round"/>',
    angry: '<path d="M88 124 Q100 114 112 124" stroke="#8a4a44" stroke-width="3.5" fill="none" stroke-linecap="round"/>',
    sad: '<path d="M89 124 Q100 117 111 124" stroke="#8a4a44" stroke-width="3" fill="none" stroke-linecap="round"/>',
  }[mood];

  const accSvg = [];
  if (acc.has('cap')) accSvg.push('<path d="M56 72 Q58 32 100 32 Q142 32 144 72Z" fill="#c0392b"/><path d="M56 72 Q36 76 28 84 Q64 84 102 72Z" fill="#a0302a"/>');
  if (acc.has('cap_guard')) accSvg.push('<path d="M55 66 Q57 28 100 28 Q143 28 145 66Z" fill="#1d2a44"/><rect x="52" y="62" width="96" height="9" fill="#131c30"/><path d="M62 71 Q100 88 138 71 Q100 80 62 71Z" fill="#0d1424"/><circle cx="100" cy="46" r="8" fill="#d9a441"/>');
  if (acc.has('glasses')) accSvg.push('<g fill="rgba(255,255,255,.25)" stroke="#2a2a2a" stroke-width="3"><rect x="69" y="84" width="27" height="20" rx="7"/><rect x="104" y="84" width="27" height="20" rx="7"/></g><path d="M96 92 L104 92" stroke="#2a2a2a" stroke-width="3"/>');
  if (acc.has('sunglasses')) accSvg.push('<g fill="#1b1b1b"><rect x="68" y="84" width="29" height="19" rx="7"/><rect x="103" y="84" width="29" height="19" rx="7"/></g><path d="M97 91 L103 91" stroke="#1b1b1b" stroke-width="3"/>');
  if (acc.has('sunglasses_head')) accSvg.push('<g fill="#1b1b1b"><rect x="66" y="46" width="28" height="15" rx="6"/><rect x="106" y="46" width="28" height="15" rx="6"/></g><path d="M94 52 L106 52" stroke="#1b1b1b" stroke-width="3"/>');
  if (acc.has('headset')) accSvg.push('<path d="M54 94 Q54 26 100 26 Q146 26 146 94" stroke="#222" stroke-width="7" fill="none"/><rect x="45" y="84" width="15" height="26" rx="6" fill="#222"/><rect x="140" y="84" width="15" height="26" rx="6" fill="#222"/><path d="M52 108 Q58 130 84 128" stroke="#222" stroke-width="3" fill="none"/><circle cx="86" cy="128" r="4" fill="#222"/>');
  if (acc.has('earring')) accSvg.push('<circle cx="57" cy="110" r="3.5" fill="#e3b341"/><circle cx="143" cy="110" r="3.5" fill="#e3b341"/>');
  if (acc.has('darkcircle')) accSvg.push('<path d="M76 104 Q84 110 92 104 M108 104 Q116 110 124 104" stroke="#7d5f78" stroke-width="3" fill="none" opacity=".55"/>');

  const torsoExtra = [];
  if (acc.has('tie')) torsoExtra.push('<path d="M88 160 L100 176 L112 160 L106 158 L100 166 L94 158Z" fill="#fff"/><path d="M100 168 L93 178 L100 214 L107 178Z" fill="#9e2f3a"/>');
  if (acc.has('mic')) torsoExtra.push('<circle cx="128" cy="184" r="4.5" fill="#222"/><path d="M128 188 L124 230" stroke="#222" stroke-width="1.5"/>');
  const badge = visitor
    ? '<rect x="87" y="194" width="26" height="30" rx="3" fill="#ffe36b" stroke="#d6b53a"/><text x="100" y="212" font-size="8" text-anchor="middle" fill="#6b5200" font-weight="900">방문</text>'
    : '<rect x="87" y="194" width="26" height="30" rx="3" fill="#fff" stroke="#c9d1de"/><text x="100" y="206" font-size="7.5" text-anchor="middle" fill="#1b4fa0" font-weight="900">EBS</text><rect x="92" y="210" width="16" height="8" rx="1" fill="#dfe6f1"/>';

  return `<svg viewBox="0 0 200 230" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(c.name)}">
    ${hairBack}
    <path d="M20 232 Q22 166 100 158 Q178 166 180 232Z" fill="${a.top}"/>
    <path d="M20 232 Q22 166 100 158 Q178 166 180 232Z" fill="url(#shadeTorso)" opacity=".25"/>
    <rect x="86" y="128" width="28" height="34" rx="10" fill="${shade(skin, .1)}"/>
    ${torsoExtra.join('')}
    <path d="M84 160 L100 196 L116 160" stroke="${visitor ? '#d6b53a' : '#1b4fa0'}" stroke-width="4" fill="none"/>
    ${badge}
    <ellipse cx="58" cy="96" rx="8" ry="11" fill="${shade(skin, .06)}"/>
    <ellipse cx="142" cy="96" rx="8" ry="11" fill="${shade(skin, .06)}"/>
    <ellipse cx="100" cy="92" rx="43" ry="49" fill="${skin}"/>
    <ellipse cx="78" cy="110" rx="8" ry="5" fill="#f08a8a" opacity=".22"/>
    <ellipse cx="122" cy="110" rx="8" ry="5" fill="#f08a8a" opacity=".22"/>
    ${brows}
    <ellipse cx="83" cy="94" rx="4.3" ry="5.3" fill="#2a2222"/>
    <ellipse cx="117" cy="94" rx="4.3" ry="5.3" fill="#2a2222"/>
    <path d="M100 98 Q96 108 100 110" stroke="${shade(skin, .25)}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    ${mouth}
    ${hairFront}
    ${accSvg.join('')}
    <defs><linearGradient id="shadeTorso" x1="0" x2="1"><stop offset="0" stop-color="#000"/><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000"/></linearGradient></defs>
  </svg>`;
}

const MANAGER = { name: '점장님', kind: 'regular', job: '점장', avatar: { skin: '#f2cdb0', hair: 'bob', hairColor: '#2d211b', top: '#0b2c5f', acc: [] } };

// ───────── 그림: 컵과 재료 아이콘
function cupIcon(temp) {
  return temp === 'ICED'
    ? '<svg viewBox="0 0 22 28"><path d="M3 5 H19 L16.5 26 H5.5Z" fill="rgba(160,210,240,.35)" stroke="currentColor" stroke-width="1.6"/><path d="M2 5 Q11 -1 20 5" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="7" y="12" width="4" height="4" fill="#fff" stroke="currentColor" stroke-width=".8"/><rect x="11" y="16" width="4" height="4" fill="#fff" stroke="currentColor" stroke-width=".8"/></svg>'
    : '<svg viewBox="0 0 22 28"><path d="M3 6 H19 L16.5 26 H5.5Z" fill="#fff" stroke="currentColor" stroke-width="1.6"/><rect x="2" y="3" width="18" height="3.5" rx="1" fill="currentColor"/><path d="M4.4 13 H17.6 L17 19 H5Z" fill="#0b2c5f"/><path d="M9 1 Q8 -1 10 -2" stroke="currentColor" fill="none"/></svg>';
}

function ingIcon(ing) {
  const c = ing.color;
  const stroke = shade(c === '#ffffff' ? '#dddddd' : c, .35);
  switch (ing.id) {
    case 'shot': return `<svg viewBox="0 0 26 26"><path d="M5 9 H19 V17 Q19 22 12 22 Q5 22 5 17Z" fill="#fff" stroke="#555" stroke-width="1.5"/><path d="M19 11 Q24 11 23 15 Q22 18 19 17" fill="none" stroke="#555" stroke-width="1.5"/><ellipse cx="12" cy="10" rx="6.5" ry="2" fill="${c}"/><path d="M9 6 Q8 3 10 1 M14 6 Q13 3 15 1" stroke="#aaa" fill="none"/></svg>`;
    case 'water': return `<svg viewBox="0 0 26 26"><path d="M13 3 Q20 12 20 16 A7 7 0 0 1 6 16 Q6 12 13 3Z" fill="${c}" stroke="#6fa9c6" stroke-width="1.5"/></svg>`;
    case 'ice': return '<svg viewBox="0 0 26 26"><rect x="3" y="9" width="10" height="10" rx="2" fill="#e8f6fd" stroke="#88bcd6" stroke-width="1.4" transform="rotate(-10 8 14)"/><rect x="12" y="6" width="10" height="10" rx="2" fill="#f4fbff" stroke="#88bcd6" stroke-width="1.4" transform="rotate(12 17 11)"/></svg>';
    case 'whip': return '<svg viewBox="0 0 26 26"><path d="M4 18 Q3 12 8 12 Q8 6 13 7 Q18 5 18 11 Q24 11 22 18Z" fill="#fff" stroke="#ccc" stroke-width="1.4"/><path d="M13 7 Q14 3 16 3" stroke="#ccc" fill="none"/></svg>';
    case 'cream': return '<svg viewBox="0 0 26 26"><ellipse cx="13" cy="15" rx="10" ry="5" fill="#fff4dc" stroke="#d9c9a6" stroke-width="1.4"/><ellipse cx="13" cy="13" rx="7" ry="3" fill="#fffaf0"/></svg>';
    default:
      if (ing.group === 'milk') return `<svg viewBox="0 0 26 26"><path d="M7 8 L10 3 H16 L19 8 V23 H7Z" fill="${c}" stroke="${stroke}" stroke-width="1.4"/><rect x="7" y="12" width="12" height="6" fill="${ing.id === 'milk' ? '#3b7dd8' : ing.id === 'oat' ? '#b8894a' : '#6b9b3a'}"/></svg>`;
      if (ing.group === 'sweet') return `<svg viewBox="0 0 26 26"><rect x="8" y="9" width="10" height="15" rx="2.5" fill="${c}" stroke="${stroke}" stroke-width="1.4"/><rect x="11.5" y="4" width="3" height="5" fill="#444"/><path d="M11 4 H22" stroke="#444" stroke-width="2.2" stroke-linecap="round"/><rect x="9.5" y="14" width="7" height="5" rx="1" fill="#fff" opacity=".75"/></svg>`;
      return `<svg viewBox="0 0 26 26"><rect x="6" y="9" width="14" height="14" rx="3" fill="#fff" stroke="#999" stroke-width="1.4"/><rect x="5" y="6" width="16" height="4" rx="1.5" fill="${stroke}"/><rect x="8" y="14" width="10" height="7" rx="1.5" fill="${c}"/></svg>`;
  }
}

function cupSVG(build) {
  if (!build.cup) return '<div class="cup-empty">왼쪽 위에서 컵을 먼저 골라 주세요.<br/>HOT/ICED · L/EX</div>';
  const ingMap = Object.fromEntries(S.boot.ingredients.map((i) => [i.id, i]));
  const ex = build.size === 'EX';
  const topY = ex ? 22 : 50;
  const botY = 212;
  const topHalf = ex ? 60 : 55;
  const botHalf = 40;
  const iced = build.cup === 'ICED';
  const cupPath = `M${80 - topHalf} ${topY} L${80 + topHalf} ${topY} L${80 + botHalf} ${botY} L${80 - botHalf} ${botY} Z`;

  // 넣은 순서대로 쌓는다 (얼음·토핑은 따로 그림)
  const seq = S.history.filter((id) => !['ice', 'whip', 'cream'].includes(id) && (build.ingredients[id] ?? 0) > 0);
  const counts = {};
  const units = [];
  for (const id of seq) {
    counts[id] = (counts[id] ?? 0) + 1;
    if (counts[id] <= build.ingredients[id]) units.push(id);
  }
  const room = botY - topY - 18;
  const unitH = Math.min(24, room / Math.max(units.length, 1));
  let y = botY;
  const groups = [];
  for (const id of units) {
    const last = groups[groups.length - 1];
    if (last && last.id === id) { last.h += unitH; last.n++; } else groups.push({ id, h: unitH, n: 1 });
  }
  const layers = groups.map((g) => {
    y -= g.h;
    const ing = ingMap[g.id];
    const dark = ['shot', 'choco', 'chestnut', 'hazelnut', 'caramel'].includes(g.id);
    const label = g.h >= 13 ? `<text x="80" y="${y + g.h / 2 + 4}" text-anchor="middle" font-size="11" font-weight="700" fill="${dark ? '#fff' : '#4b3b2b'}">${esc(ing.short)}${g.n > 1 ? ` ×${g.n}` : ''}</text>` : '';
    return `<rect x="0" y="${y}" width="160" height="${g.h}" fill="${ing.color}"/>${label}`;
  }).join('');
  const surface = y;

  let tops = '';
  const cream = build.ingredients.cream ?? 0;
  if (cream) { tops += `<rect x="0" y="${surface - 10}" width="160" height="10" fill="#fff4dc"/><text x="80" y="${surface - 2}" text-anchor="middle" font-size="9" fill="#8a7550" font-weight="700">크림${cream > 1 ? ` ×${cream}` : ''}</text>`; }
  let whip = '';
  const w = build.ingredients.whip ?? 0;
  if (w) {
    const wy = surface - (cream ? 10 : 0);
    whip = `<path d="M${80 - topHalf + 12} ${wy} Q${50} ${wy - 26} 80 ${wy - 22 - w * 6} Q${110} ${wy - 26} ${80 + topHalf - 12} ${wy} Z" fill="#fff" stroke="#e5e5e5" stroke-width="2"/><text x="80" y="${wy - 8}" text-anchor="middle" font-size="10" fill="#999" font-weight="700">휘핑${w > 1 ? ` ×${w}` : ''}</text>`;
  }
  let ice = '';
  const iceN = build.ingredients.ice ?? 0;
  if (iceN) {
    const area = Math.max(surface, topY + 40);
    const cubes = 4 + iceN * 3;
    for (let i = 0; i < cubes; i++) {
      const cx = 40 + ((i * 37) % 80);
      const cy = area + 8 + ((i * 23) % Math.max(20, botY - area - 24));
      ice += `<rect x="${cx}" y="${cy}" width="18" height="16" rx="3" fill="rgba(255,255,255,.55)" stroke="rgba(120,170,200,.8)" stroke-width="1.5" transform="rotate(${(i * 29) % 40 - 20} ${cx + 9} ${cy + 8})"/>`;
    }
  }

  const cupDraw = iced
    ? `<path d="${cupPath}" fill="rgba(215,238,250,.25)" stroke="#8fb2c6" stroke-width="3"/><ellipse cx="80" cy="${topY}" rx="${topHalf + 3}" ry="6" fill="none" stroke="#8fb2c6" stroke-width="3"/><path d="M${80 - topHalf + 10} ${topY + 12} L${80 - botHalf + 6} ${botY - 10}" stroke="#fff" stroke-width="5" opacity=".6" stroke-linecap="round"/>`
    : `<path d="${cupPath}" fill="rgba(255,255,255,.18)" stroke="#cbbfae" stroke-width="3"/><rect x="${80 - topHalf - 4}" y="${topY - 7}" width="${(topHalf + 4) * 2}" height="9" rx="3" fill="#fff" stroke="#cbbfae" stroke-width="2"/><path d="M${80 - topHalf * 0.86} ${topY + (botY - topY) * 0.42} L${80 + topHalf * 0.86} ${topY + (botY - topY) * 0.42} L${80 + topHalf * 0.8} ${topY + (botY - topY) * 0.62} L${80 - topHalf * 0.8} ${topY + (botY - topY) * 0.62} Z" fill="#0b2c5f" opacity=".72"/><text x="80" y="${topY + (botY - topY) * 0.54}" text-anchor="middle" font-size="11" fill="#fff" font-weight="900" letter-spacing="2">EDIYA</text>`;

  return `<svg viewBox="-6 0 172 232" xmlns="http://www.w3.org/2000/svg">
    <defs><clipPath id="cupClip"><path d="${cupPath}"/></clipPath></defs>
    <ellipse cx="80" cy="220" rx="56" ry="7" fill="rgba(0,0,0,.12)"/>
    <g clip-path="url(#cupClip)">${layers}${tops}${ice}</g>
    ${whip}
    ${cupDraw}
    ${units.length === 0 && !iceN && !w && !cream ? `<text x="80" y="${(topY + botY) / 2}" text-anchor="middle" font-size="12" fill="#9a8f80">재료를 넣어 주세요</text>` : ''}
  </svg>`;
}

// ───────── 시작 화면
async function init() {
  S.boot = await api('/bootstrap');
  renderAiBadges();
  renderLeaderboard($('#leaderboard-title'), S.boot.leaderboard);
  renderDex($('#dex-title'), []);
  const saved = localStorageGet('barista-name');
  if (saved) {
    $('#player-name').value = saved;
    try { const { player } = await api('/players', { name: saved }); S.player = player; renderDex($('#dex-title'), player.found); } catch { /* 무시 */ }
  }
  wireStatic();
  requestAnimationFrame(loop);
}

function localStorageGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function localStorageSet(k, v) { try { localStorage.setItem(k, v); } catch { /* 무시 */ } }

function renderAiBadges() {
  const { ai } = S.boot;
  for (const el of [$('#ai-badge-title'), $('#ai-badge-game')]) {
    el.className = `ai-badge ${ai.enabled ? 'on' : 'off'}`;
    el.textContent = ai.enabled ? `AI 연결됨 · ${ai.model}` : '오프라인 모드 (템플릿 대사)';
    el.title = ai.enabled ? '손님 대사를 생성형 AI가 만듭니다.' : 'OPENAI_API_KEY가 없어 미리 준비한 대사를 씁니다.';
  }
}

function renderLeaderboard(el, rows) {
  el.innerHTML = rows.length
    ? rows.map((r, i) => `<li><span class="rank">${i + 1}</span><span>${esc(r.player)} <small class="muted">Day ${r.day}</small></span><b>${r.total_score}점</b></li>`).join('')
    : '<li class="empty">아직 기록이 없어요. 첫 주인공이 되어 보세요!</li>';
}

function renderDex(el, found) {
  const set = new Set(found);
  el.innerHTML = S.boot.characters.map((c) => `<div class="dex-item ${set.has(c.id) ? 'found' : ''}" style="--c:${c.color}" title="${set.has(c.id) ? esc(c.name) : '???'}">${set.has(c.id) ? c.emoji : '?'}<small>${set.has(c.id) ? esc(c.name) : '???'}</small></div>`).join('');
  const cnt = $('#dex-count');
  if (cnt && el.id === 'dex-title') cnt.textContent = `${set.size}/${S.boot.characters.length}`;
}

function wireStatic() {
  $('#start-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#player-name').value.trim();
    if (!name) return;
    try {
      const { player } = await api('/players', { name });
      S.player = player;
      localStorageSet('barista-name', name);
      await startShift();
    } catch (err) { toast(err.message); }
  });

  $('#ask-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = $('#ask-input').value.trim();
    if (q) ask(q);
  });
  $$('#quick-qs button').forEach((b) => b.addEventListener('click', () => ask(b.dataset.q)));

  $('#btn-undo').addEventListener('click', undo);
  $('#btn-discard').addEventListener('click', discard);
  $('#btn-serve').addEventListener('click', () => serve(false));

  $$('.tab').forEach((t) => t.addEventListener('click', () => showTab(t.dataset.tab)));

  $('#trace-toggle').addEventListener('click', () => toggleDrawer());
  $('#trace-close').addEventListener('click', () => toggleDrawer(false));
}

function showTab(name) {
  $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
  ['menu', 'rules', 'ledger', 'policy'].forEach((n) => { $(`#tab-${n}`).hidden = n !== name; });
}

// ───────── 영업 시작
async function startShift() {
  const { shift } = await api('/shifts', { player: S.player.name, demo: $('#demo-mode').checked });
  Object.assign(S, { shift, money: 0, score: 0, traces: [], next: null });
  $('#screen-title').hidden = true;
  $('#screen-report').hidden = true;
  $('#screen-game').hidden = false;
  window.scrollTo(0, 0);
  renderTraces();
  renderMenuBoard();
  renderRules();
  renderPolicies();
  renderCupPicker();
  renderStation();
  updateHud();
  await nextCustomer();
}

function updateHud() {
  $('#hud-day').textContent = `Day ${S.shift.day}`;
  $('#hud-clock').textContent = `🕘 ${S.order?.clock ?? '08:30'}`;
  $('#hud-count').textContent = `손님 ${S.order?.seq ?? 1}/${S.shift.total}`;
  $('#hud-money').textContent = won(S.money);
  $('#hud-score').textContent = S.score;
  renderMonitor();
}

function renderMonitor() {
  const clock = S.order?.clock ?? '08:30';
  const next = S.boot.schedule.find((s) => s.time >= clock);
  $('#monitor-list').innerHTML = S.boot.schedule.map((s) => `<li class="${s === next ? 'now' : s.time < clock ? 'past' : ''}"><b>${s.time}</b>${esc(s.title)}</li>`).join('');
}

function renderMenuBoard() {
  const ingMap = Object.fromEntries(S.boot.ingredients.map((i) => [i.id, i]));
  const cats = [...new Set(S.boot.menu.map((m) => m.category))];
  $('#tab-menu').innerHTML = `<div class="menuboard">
    <div class="mb-head"><span class="brand-word">EDIYA COFFEE</span><small>게임용 레시피 · 가격</small></div>
    ${cats.map((cat) => `<div class="mb-cat">${cat}<span>L</span><span>EX</span></div>
      ${S.boot.menu.filter((m) => m.category === cat).map((m) => `<div class="mb-row">
        <span class="mb-name">${esc(m.name)}<span class="mb-temps">${m.temps.join('·')}</span></span>
        <span class="mb-price">${(m.price / 1000).toFixed(1)}</span><span class="mb-price">${((m.price + 700) / 1000).toFixed(1)}</span>
        <span class="mb-recipe">${Object.entries(m.base).map(([k, v]) => `${ingMap[k].short} ${v}`).join(' · ')}</span>
      </div>`).join('')}`).join('')}
  </div>`;
}

function renderRules() {
  $('#tab-rules').innerHTML = `<table class="rules-table">
    <tr><th>주문 옵션</th><th>레시피 변화</th></tr>
    <tr><td><b>ICED</b></td><td>얼음 1 추가 (HOT은 얼음 없음)</td></tr>
    <tr><td><b>샷 추가</b></td><td>에스프레소 샷 +1 (커피 메뉴만)</td></tr>
    <tr><td><b>덜 달게 / 더 달게</b></td><td>메뉴의 단맛 재료 -1 / +1 (최소 1)<br/><span class="muted">카라멜 마끼아또는 바닐라 시럽 기준</span></td></tr>
    <tr><td><b>오트밀크 / 두유</b></td><td>우유 대신 해당 재료 1</td></tr>
    <tr><td><b>휘핑 추가 / 빼기</b></td><td>휘핑크림 1 / 0 (모카·토피넛·초콜릿 라떼)</td></tr>
    <tr><td><b>사이즈 L / EX</b></td><td>컵만 달라지고 레시피는 같아요 (EX +700원)</td></tr>
  </table>
  <p class="muted" style="margin-top:10px">채점: 온도 -25 · 사이즈 -10 · 재료 1개 차이당 -12 · 버린 음료 -5</p>`;
}

function renderPolicies() {
  $('#tab-policy').innerHTML = `<ul class="policy-list">${S.boot.policies.map((p) => `<li><b>${esc(p.title)}</b>${esc(p.text)}</li>`).join('')}</ul>
  <p class="muted" style="margin-top:10px">진상 손님을 응대할 때 근거가 되는 DB 데이터예요.</p>`;
}

function renderLedger() {
  const o = S.order;
  if (!o) return;
  const db = S.orderDb?.customer;
  const goal = S.boot.policies.find((p) => p.key === 'stamp_goal')?.value ?? 10;
  const stamps = Math.min(o.state.stamps, goal);
  $('#tab-ledger').innerHTML = `<div class="ledger-card">
    <div class="ledger-top"><div class="mini">${avatarSVG(o.customer)}</div>
      <div><b>${esc(o.customer.name)}</b> <span class="muted">${esc(o.customer.job)}</span><br/>
      <span class="muted">방문 ${o.state.visits}회</span>
      <div class="stamps" title="스탬프 ${o.state.stamps}/${goal}">${Array.from({ length: goal }, (_, i) => `<i class="${i < stamps ? 'on' : ''}"></i>`).join('')}</div></div>
    </div>
    ${db?.memo ? `<div class="memo"><b>지난 방문 메모 (DB)</b>${esc(db.memo)}</div>` : ''}
    <div><b>지난 주문</b>
      ${o.ledger.length ? `<ul class="ledger-list">${o.ledger.map((l) => `<li>${esc(l.text)}<small>Day ${l.day} ${l.clock} · ${l.score ?? 0}점</small></li>`).join('')}</ul>` : '<p class="muted">이 손님의 주문 기록이 아직 없어요.</p>'}
    </div>
  </div>`;
}

// ───────── 제조대
function renderCupPicker() {
  const opts = [['HOT', 'L'], ['HOT', 'EX'], ['ICED', 'L'], ['ICED', 'EX']];
  $('#cup-picker').innerHTML = opts.map(([t, s]) => `<button type="button" class="cup-btn ${t.toLowerCase()}" data-cup="${t}" data-size="${s}">${cupIcon(t)}<span>(${s}) ${t}</span></button>`).join('');
  $$('#cup-picker .cup-btn').forEach((b) => b.addEventListener('click', () => selectCup(b.dataset.cup, b.dataset.size)));
}

const GROUPS = [
  ['base', '에스프레소 머신 · 정수 · 얼음'],
  ['milk', '우유 냉장고'],
  ['sweet', '시럽 · 소스 펌프'],
  ['powder', '파우더 · 베이스'],
  ['topping', '토핑'],
];

function renderStation() {
  $('#station').innerHTML = GROUPS.map(([g, title]) => `<div class="station-group"><h3>${title}</h3><div class="station-row">
    ${S.boot.ingredients.filter((i) => i.group === g).map((i) => `<button type="button" class="ing" data-id="${i.id}" title="${esc(i.name)} 넣기">${ingIcon(i)}<span>${esc(i.short)}</span></button>`).join('')}
  </div></div>`).join('') + '<p class="station-note">클릭하면 1번씩 넣어요. 숫자 옆 −로 하나 빼기.</p>';
  $$('#station .ing').forEach((b) => b.addEventListener('click', (e) => {
    if (e.target.closest('.minus')) removeIngredient(b.dataset.id);
    else addIngredient(b.dataset.id);
  }));
  renderBuild();
}

function renderBuild() {
  const b = S.build;
  $$('#cup-picker .cup-btn').forEach((btn) => btn.classList.toggle('active', btn.dataset.cup === b.cup && btn.dataset.size === b.size));
  $$('#station .ing').forEach((btn) => {
    const n = b.ingredients[btn.dataset.id] ?? 0;
    btn.querySelector('.n')?.remove();
    btn.querySelector('.minus')?.remove();
    if (n > 0) btn.insertAdjacentHTML('beforeend', `<span class="n">${n}</span><span class="minus" role="button" aria-label="하나 빼기">−</span>`);
  });
  $('#cup-view').innerHTML = cupSVG(b);
  const total = Object.values(b.ingredients).reduce((s, v) => s + v, 0);
  $('#build-label').textContent = b.cup ? `(${b.size}) ${b.cup} · 재료 ${total}개${S.waste ? ` · 버린 잔 ${S.waste}` : ''}` : '컵을 골라 주세요';
}

function selectCup(cup, size) {
  if (!S.order || S.order.done) return;
  S.build.cup = cup;
  S.build.size = size;
  renderBuild();
}

function addIngredient(id) {
  if (!S.order || S.order.done) return;
  if (!S.build.cup) { toast('컵을 먼저 골라 주세요.'); return; }
  S.build.ingredients[id] = (S.build.ingredients[id] ?? 0) + 1;
  S.history.push(id);
  renderBuild();
}

function removeIngredient(id) {
  if (!S.build.ingredients[id]) return;
  S.build.ingredients[id] -= 1;
  if (!S.build.ingredients[id]) delete S.build.ingredients[id];
  const idx = S.history.lastIndexOf(id);
  if (idx >= 0) S.history.splice(idx, 1);
  renderBuild();
}

function undo() {
  const id = S.history.pop();
  if (!id) return;
  S.build.ingredients[id] -= 1;
  if (!S.build.ingredients[id]) delete S.build.ingredients[id];
  renderBuild();
}

function discard() {
  const total = Object.values(S.build.ingredients).reduce((s, v) => s + v, 0);
  if (total > 0) S.waste += 1;
  S.build = { cup: null, size: null, ingredients: {} };
  S.history = [];
  renderBuild();
  if (total > 0) toast('음료를 버렸어요. (버린 잔은 -5점)');
}

// ───────── 대화
function addMsg(speaker, text, opts = {}) {
  const log = $('#chat-log');
  const who = speaker === 'customer' ? S.order?.customer.name : speaker === 'barista' ? '나' : '';
  const el = document.createElement('div');
  el.className = `msg ${speaker}${opts.alert ? ' alert' : ''}`;
  el.innerHTML = speaker === 'system' ? esc(text) : `<span class="who">${esc(who)}</span>${esc(text)}`;
  log.appendChild(el);
  log.scrollTop = log.scrollHeight;
  return el;
}

function addTyping() {
  const el = addMsg('customer', '');
  el.insertAdjacentHTML('beforeend', '<span class="typing"><i></i><i></i><i></i></span>');
  return el;
}

function customerSays(text, opts = {}) {
  const bubble = $('#bubble');
  bubble.hidden = false;
  bubble.classList.toggle('rush', Boolean(opts.rush || opts.alert));
  bubble.style.animation = 'none';
  void bubble.offsetWidth;
  bubble.style.animation = '';
  $('#bubble-text').textContent = text;
  if (!opts.bubbleOnly) addMsg('customer', text, opts);
}

function flash(text, cls = '') {
  const f = $('#alert-flash');
  f.hidden = false;
  f.className = `alert-flash ${cls}`;
  f.textContent = text;
  f.style.animation = 'none';
  void f.offsetWidth;
  f.style.animation = '';
  clearTimeout(flash.timer);
  flash.timer = setTimeout(() => { f.hidden = true; }, 1700);
}

function setMood(mood) {
  if (!S.order) return;
  $('#customer-figure').innerHTML = avatarSVG(S.order.customer, mood);
}

async function ask(question) {
  if (!S.order || S.order.done || S.busy) return;
  if (S.questionsLeft <= 0) { toast('이 손님에게는 더 물어볼 수 없어요.'); return; }
  $('#ask-input').value = '';
  addMsg('barista', question);
  const typing = addTyping();
  S.busy = true;
  pause('ask');
  // 질문하면 인내심이 줄어든다 (PRD 5.3)
  S.patience = Math.max(0.02, S.patience - 0.1);
  try {
    const r = await api(`/orders/${S.order.id}/ask`, { question });
    typing.remove();
    S.questionsLeft = r.questionsLeft;
    updateQuestionsLeft();
    customerSays(r.answer);
    pushTrace('되묻기', r);
  } catch (err) {
    typing.remove();
    toast(err.message);
  } finally {
    S.busy = false;
    resume('ask');
  }
}

function updateQuestionsLeft() {
  $('#q-left').textContent = `질문 ${S.questionsLeft}회 남음`;
  const disabled = S.questionsLeft <= 0;
  $$('#quick-qs button, #ask-form button, #ask-input').forEach((el) => { el.disabled = disabled; });
}

// ───────── 손님 흐름
async function nextCustomer() {
  const cust = $('#customer');
  cust.classList.add('leave');
  $('#bubble').hidden = true;
  $('#patience').hidden = true;
  await sleep(300);
  $('#customer-figure').innerHTML = '';
  $('#nametag').innerHTML = '';
  $('#chat-log').innerHTML = '';
  addMsg('system', '손님이 들어오고 있어요…');
  const typing = addTyping();
  pause('loading');
  let data = null;
  try {
    data = S.next ? await S.next : null;
    S.next = null;
    if (!data) data = await api(`/shifts/${S.shift.id}/next`, {});
  } catch (err) {
    typing.remove();
    toast(err.message, 4000);
    addMsg('system', `손님을 불러오지 못했어요: ${err.message}`);
    return;
  }
  typing.remove();
  resume('loading');
  await presentOrder(data);
}

async function presentOrder(data) {
  const o = data.order;
  Object.assign(S, {
    order: o, orderDb: data.db,
    build: { cup: null, size: null, ingredients: {} }, history: [], waste: 0,
    patience: 1, elapsed: 0, questionsLeft: S.boot.rules.maxQuestions,
    changesFired: 0, lastChangeAt: 0, rushTimer: 0, rushIdx: 0,
  });
  pushTrace(`${o.seq}번째 손님 입장 · ${o.customer.name}`, data);
  updateHud();
  updateQuestionsLeft();
  renderBuild();
  renderLedger();
  $('#chat-log').innerHTML = '';
  addMsg('system', `${o.clock} · ${o.customer.name} (${o.customer.job})${o.state.visits ? ` · 방문 ${o.state.visits}회` : ' · 첫 방문'}`);
  $('#pos-screen').innerHTML = `ORDER #${String(o.id).padStart(4, '0')}<br/>${esc(o.customer.name)}<br/>${o.clock}`;

  const cust = $('#customer');
  cust.classList.remove('leave');
  cust.classList.add('enter');
  $('#customer-figure').innerHTML = avatarSVG(o.customer, o.kind === 'nuisance' ? 'neutral' : 'happy');
  $('#nametag').className = `nametag${o.kind === 'easter' ? ' easter' : ''}`;
  $('#nametag').innerHTML = `${esc(o.customer.name)}<small>${esc(o.customer.job)}</small>`;
  void cust.offsetWidth;
  cust.classList.remove('enter');
  await sleep(350);

  if (o.kind === 'easter') await easterSplash(o);

  customerSays(o.line);
  $('#patience').hidden = false;
  renderPatience();

  if (o.startEvent) {
    const r = await openRespond({ type: o.startEvent.type, line: o.line, phase: 'start' });
    if (r?.leave) {
      S.order.done = true;
      setMood('angry');
      preloadNext();
      openResult({
        result: { score: 0, grade: '떠남', mistakes: ['응대가 만족스럽지 않아 손님이 떠났어요'], expected: null, made: null, sales: 0, tip: 0, left: true },
        line: r.line, nuisanceGrade: 'C',
      }, r);
      return;
    }
    S.startJudge = r;
  } else {
    S.startJudge = null;
  }
  resume('idle');
}

async function easterSplash(o) {
  pause('splash');
  const el = document.createElement('div');
  el.className = 'easter-splash';
  el.innerHTML = `<div class="easter-card"><div class="big">${o.customer.emoji}</div><h2>✨ EBS 캐릭터 손님 등장 ✨</h2><h3>${esc(o.customer.name)}</h3><div class="muted">${esc(o.customer.job)}</div>${o.newCharacter ? '<span class="new">도감 NEW!</span>' : ''}</div>`;
  document.body.appendChild(el);
  await sleep(2100);
  el.remove();
  flash('이스터에그 손님! 팁 2배 · +20점', 'gold');
  resume('splash');
}

function renderPatience() {
  const p = $('#patience');
  $('#patience-fill').style.width = `${Math.round(S.patience * 100)}%`;
  p.classList.toggle('warn', S.patience < 0.5 && S.patience >= 0.25);
  p.classList.toggle('danger', S.patience < 0.25);
}

function loop(ts) {
  const dt = S.lastTick ? Math.min(0.25, (ts - S.lastTick) / 1000) : 0;
  S.lastTick = ts;
  if (S.order && !S.order.done && S.pauses.size === 0) {
    const drain = S.order.rush?.drain ?? 1;
    S.elapsed += dt;
    S.patience = Math.max(0, S.patience - (dt * drain) / S.boot.rules.patienceSeconds);
    renderPatience();
    if (S.order.rush) {
      S.rushTimer += dt;
      if (S.rushTimer >= 11 && S.rushIdx < S.order.rush.lines.length) {
        S.rushTimer = 0;
        customerSays(S.order.rush.lines[S.rushIdx++], { rush: true });
        setMood('angry');
      }
    }
    maybeFireChange();
    if (S.patience <= 0) serve(true);
  }
  requestAnimationFrame(loop);
}

function maybeFireChange() {
  const o = S.order;
  if (!o.changes || S.changesFired >= o.changes || S.eventBusy || S.busy) return;
  const units = Object.values(S.build.ingredients).reduce((s, v) => s + v, 0);
  const ready = S.changesFired === 0
    ? S.elapsed >= 6 && (units >= 2 || S.elapsed >= 16)
    : S.elapsed - S.lastChangeAt >= 10 && units >= 2;
  if (ready) fireChange();
}

async function fireChange() {
  S.eventBusy = true;
  pause('event');
  try {
    const r = await api(`/orders/${S.order.id}/event`, { type: 'change' });
    S.changesFired += 1;
    S.lastChangeAt = S.elapsed;
    flash('주문 변경!');
    customerSays(r.line, { alert: true });
    pushTrace('진상 이벤트 · 주문 변경', r);
  } catch (err) {
    S.changesFired = S.order.changes;
    toast(err.message);
  } finally {
    S.eventBusy = false;
    resume('event');
  }
}

function preloadNext() {
  if (S.order.seq >= S.shift.total) { S.next = null; return; }
  S.next = api(`/shifts/${S.shift.id}/next`, {}).catch(() => null);
}

async function serve(left) {
  if (!S.order || S.order.done || S.busy) return;
  if (!left && !S.build.cup) { toast('컵을 먼저 골라 주세요.'); return; }
  S.busy = true;
  S.order.done = true;
  pause('serve');
  $('#btn-serve').disabled = true;
  if (left) addMsg('system', '손님이 기다리다 지쳐서 떠났어요…');
  else addMsg('system', `(${S.build.size}) ${S.build.cup} 음료를 건넸어요.`);
  try {
    const r = await api(`/orders/${S.order.id}/serve`, {
      build: S.build, patience: S.patience, waste: S.waste, left,
    });
    pushTrace(left ? '손님 떠남' : '서빙 · 채점', r);
    S.money += r.result.sales + r.result.tip;
    S.score += r.result.score + (r.nuisancePoints || 0) + (r.easterBonus || 0);
    updateHud();
    customerSays(r.line);
    setMood(left ? 'angry' : r.result.score >= 80 ? 'happy' : r.result.score >= 50 ? 'neutral' : 'sad');

    let judge = null;
    if (r.followUp) {
      await sleep(900);
      if (r.followUp.type === 'refund') addMsg('system', '(10분 뒤) 손님이 반쯤 마신 컵을 들고 다시 왔어요.');
      setMood('angry');
      customerSays(r.followUp.line, { alert: true });
      flash(r.followUp.type === 'refund' ? '환불 요구!' : '항의 발생!');
      await sleep(600);
      judge = await openRespond({ type: r.followUp.type, line: r.followUp.line, phase: 'after' });
    }
    preloadNext();
    openResult(r, judge);
  } catch (err) {
    toast(err.message, 4000);
    S.order.done = false;
  } finally {
    resume('serve');
    S.busy = false;
    $('#btn-serve').disabled = false;
  }
}

// ───────── 모달
function openModal(html) {
  const root = $('#modal-root');
  root.innerHTML = `<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`;
  return root.querySelector('.modal');
}
const closeModal = () => { $('#modal-root').innerHTML = ''; };

const NUISANCE_TITLE = {
  fake_regular: '서비스를 요구하는 손님',
  unreasonable: '무리한 요구',
  insist: '"제가 분명히 말했잖아요!"',
  refund: '환불 요구',
};
const NUISANCE_TIP = {
  fake_regular: '주문·방문 기록에서 실제 방문 횟수와 스탬프를 확인해 보세요.',
  unreasonable: '매장 규정을 확인하고, 규정 안에서 가능한 대안을 제안해 보세요.',
  insist: '대화 기록에서 손님이 실제로 뭐라고 주문했는지 확인해 보세요.',
  refund: '주문·방문 기록에서 이번 음료가 레시피대로 만들어졌는지 확인해 보세요.',
};

function openRespond({ type, line, phase }) {
  pause('respond');
  return new Promise((resolve) => {
    const checked = new Set();
    let evidence = null;
    const m = openModal(`
      <div class="modal-head warn"><span style="font-size:22px">⚠️</span><div><h2>${NUISANCE_TITLE[type]}</h2><span class="muted">${phase === 'start' ? '제조 전에 응대해야 해요' : '서빙 후 항의가 들어왔어요'} · 타이머 정지</span></div></div>
      <div class="modal-body">
        <div class="say"><div class="mini">${avatarSVG(S.order.customer, 'angry')}</div><p>${esc(line)}</p></div>
        <div>
          <div class="evidence-tabs">
            <button type="button" data-ev="log">💬 대화 기록</button>
            <button type="button" data-ev="ledger">📒 주문·방문 기록</button>
            <button type="button" data-ev="policy">📋 매장 규정</button>
          </div>
          <div class="evidence-box" id="ev-box" hidden></div>
        </div>
        <p class="tip-line">💡 ${NUISANCE_TIP[type]} 근거를 확인하고 정중하게, 규정 안에서 응대하세요.</p>
        <form class="respond-form" id="respond-form">
          <textarea id="respond-text" maxlength="300" placeholder="손님에게 할 말을 입력하세요" required></textarea>
        </form>
      </div>
      <div class="modal-foot"><button class="btn primary" id="respond-send" type="button">응대하기</button></div>`);

    const box = $('#ev-box', m);
    $$('.evidence-tabs button', m).forEach((btn) => btn.addEventListener('click', async () => {
      const kind = btn.dataset.ev;
      checked.add(kind);
      $$('.evidence-tabs button', m).forEach((b) => b.classList.toggle('active', b === btn));
      btn.classList.add('seen');
      box.hidden = false;
      if (!evidence) {
        box.innerHTML = '불러오는 중…';
        try { evidence = await api(`/orders/${S.order.id}/evidence`); } catch (err) { box.textContent = err.message; return; }
      }
      box.innerHTML = renderEvidence(kind, evidence);
    }));

    const send = async () => {
      const reply = $('#respond-text', m).value.trim();
      if (!reply) { toast('응대할 말을 입력해 주세요.'); return; }
      const btn = $('#respond-send', m);
      btn.disabled = true;
      btn.textContent = '손님 반응 기다리는 중…';
      try {
        const r = await api(`/orders/${S.order.id}/respond`, { reply, checked: [...checked] });
        pushTrace('진상 응대 판정', r);
        addMsg('barista', reply);
        customerSays(r.line);
        S.score += r.judge.bonus;
        S.money -= r.judge.losses;
        updateHud();
        setMood(r.judge.grade === 'C' ? 'angry' : r.judge.violations.length ? 'happy' : r.judge.grade === 'B' ? 'neutral' : 'happy');
        showJudge(m, r, () => { closeModal(); resume('respond'); resolve({ ...r.judge, leave: r.leave, line: r.line }); });
      } catch (err) {
        toast(err.message);
        btn.disabled = false;
        btn.textContent = '응대하기';
      }
    };
    $('#respond-send', m).addEventListener('click', send);
    $('#respond-text', m).addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send(); });
    $('#respond-text', m).focus();
  });
}

function renderEvidence(kind, ev) {
  if (kind === 'log') {
    return ev.logs.map((l) => `<div class="log-line"><time>${new Date(l.created_at).toLocaleTimeString('ko-KR', { hour12: false })}</time><b>${l.speaker === 'customer' ? '손님' : l.speaker === 'barista' ? '나' : '시스템'}</b><span>${esc(l.text)}</span></div>`).join('');
  }
  if (kind === 'ledger') {
    const l = ev.ledger;
    return `<p style="margin:0 0 6px"><b>방문 ${l.visits}회 · 스탬프 ${l.stamps}/${l.stampGoal}개</b></p>
      ${l.thisOrder ? `<p style="margin:0 0 6px">이번 주문: ${esc(l.thisOrder.text)}<br/>채점 결과: <b>${l.thisOrder.score}점</b> · ${l.thisOrder.mistakes?.length ? esc(l.thisOrder.mistakes.join(', ')) : '레시피대로 정확히 제조됨'}</p>` : ''}
      ${l.history.length ? `<p style="margin:0">지난 주문</p><ul style="margin:2px 0 0;padding-left:18px">${l.history.map((h) => `<li>Day ${h.day} ${h.clock} · ${esc(h.text)} (${h.score ?? 0}점)</li>`).join('')}</ul>` : '<p style="margin:0" class="muted">지난 주문 기록 없음</p>'}`;
  }
  return `<ul style="margin:0;padding-left:18px">${ev.policies.map((p) => `<li><b>${esc(p.title)}</b>: ${esc(p.text)}</li>`).join('')}</ul>`;
}

function showJudge(m, r, onDone) {
  const j = r.judge;
  $('.modal-body', m).innerHTML = `
    <div class="grade-big"><div class="grade-letter g-${j.grade}">${j.grade}</div>
      <div><h3 style="font-size:18px">응대 점수 ${j.points}점 <span class="muted">(${j.bonus >= 0 ? '+' : ''}${j.bonus}점 반영)</span></h3>
      <span class="muted">정중함 ${j.politeness}/5 · 근거 확인 ${j.usedEvidence ? 'O' : 'X'} · 규정 위반 ${j.violations.length}건</span></div></div>
    <div class="say"><div class="mini">${avatarSVG(S.order.customer, j.grade === 'C' ? 'angry' : 'neutral')}</div><p>${esc(r.line)}</p></div>
    <ul class="notes">${j.notes.map((n) => `<li>${esc(n)}</li>`).join('')}${j.effects.map((e) => `<li><b>${esc(e)}</b></li>`).join('')}</ul>`;
  $('.modal-foot', m).innerHTML = `<button class="btn primary" type="button" id="judge-ok">${r.leave ? '확인' : '계속하기'}</button>`;
  $('#judge-ok', m).addEventListener('click', onDone);
}

function openResult(r, judge) {
  pause('result');
  const res = r.result;
  const ingMap = Object.fromEntries(S.boot.ingredients.map((i) => [i.id, i]));
  const last = S.order.seq >= S.shift.total;
  const ringColor = res.score >= 80 ? 'var(--green)' : res.score >= 50 ? 'var(--gold)' : 'var(--red)';

  let compare = '';
  if (res.expected) {
    const made = res.made?.ingredients ?? {};
    const keys = [...new Set([...Object.keys(res.expected.ingredients), ...Object.keys(made)])];
    const rows = keys.map((k) => {
      const want = res.expected.ingredients[k] ?? 0;
      const got = made[k] ?? 0;
      return `<tr class="${want !== got ? 'bad' : ''}"><td>${esc(ingMap[k]?.name ?? k)}</td><td class="num">${want}</td><td class="num mine">${got}</td></tr>`;
    }).join('');
    const cupBad = !res.made || res.made.cup !== res.expected.cup || res.made.size !== res.expected.size;
    compare = `<table class="compare"><tr><th>항목</th><th class="num">정답</th><th class="num">내 음료</th></tr>
      <tr class="${cupBad ? 'bad' : ''}"><td>컵</td><td class="num">(${res.expected.size}) ${res.expected.cup}</td><td class="num mine">${res.made?.cup ? `(${res.made.size}) ${res.made.cup}` : '-'}</td></tr>${rows}</table>`;
  }
  const nGrade = judge?.grade ?? r.nuisanceGrade;

  const m = openModal(`
    <div class="modal-head ${S.order.kind === 'easter' ? 'gold' : ''}"><h2>${S.order.clock} · ${esc(S.order.customer.name)} 손님 결과</h2></div>
    <div class="modal-body">
      <div class="result-top">
        <div class="score-ring" style="--p:${res.score};--ring:${ringColor}"><span>${res.score}</span></div>
        <div><h3>${esc(res.grade)}</h3>
          <div class="money-row"><span>매출 ${won(res.sales)}</span><span>팁 ${won(res.tip)}</span>${r.easterBonus ? `<span>이스터에그 +${r.easterBonus}점</span>` : ''}${nGrade ? `<span>진상 응대 ${nGrade}</span>` : ''}</div>
        </div>
      </div>
      <div class="say"><div class="mini">${avatarSVG(S.order.customer, res.score >= 80 ? 'happy' : res.score >= 50 ? 'neutral' : 'sad')}</div><p>${esc(r.line)}</p></div>
      ${res.mistakes.length ? `<ul class="mistakes">${res.mistakes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p style="margin:0;color:var(--green);font-weight:700">레시피와 완벽하게 일치해요! 👏</p>'}
      ${compare}
    </div>
    <div class="modal-foot"><button class="btn primary" type="button" id="result-next">${last ? '영업 마감하기' : '다음 손님 받기'}</button></div>`);

  $('#result-next', m).addEventListener('click', async () => {
    closeModal();
    resume('result');
    pause('idle');
    if (last) await endShift();
    else await nextCustomer();
  });
}

// ───────── 마감
async function endShift() {
  pause('idle');
  $('#modal-root').innerHTML = '<div class="modal-backdrop"><div class="modal"><div class="modal-body" style="text-align:center">점장님이 오늘 영업을 정산하고 있어요… ☕</div></div></div>';
  let r;
  try {
    r = await api(`/shifts/${S.shift.id}/end`, {});
  } catch (err) {
    closeModal();
    toast(err.message, 4000);
    return;
  }
  closeModal();
  pushTrace('마감 리포트', r);
  S.player = r.player ?? S.player;
  S.order = null;
  renderReport(r);
}

function renderReport(r) {
  const { report, stats } = r;
  const customers = Object.fromEntries([...S.boot.characters.map((c) => [c.id, { ...c, kind: 'easter' }])]);
  $('#screen-game').hidden = true;
  $('#screen-report').hidden = false;
  window.scrollTo(0, 0);
  toggleDrawer(false);
  const reviewAvatar = (rv) => {
    if (customers[rv.customerId]) return avatarSVG(customers[rv.customerId]);
    const known = S.reviewAvatars?.[rv.customerId];
    return known ? avatarSVG(known) : '';
  };
  $('#report').innerHTML = `
    <div class="report-hero"><small>EDIYA COFFEE EBS 1호점 · 마감 리포트 · Day ${S.shift.day}</small><h1>${esc(report.headline)}</h1><span>바리스타 ${esc(S.player.name)}</span></div>
    <div class="report-grid">
      <div class="card">
        <h3>점장님 한마디</h3>
        <div class="manager">${avatarSVG(MANAGER, 'happy')}<div><p>${esc(report.comment)}</p><p class="advice">💡 ${esc(report.advice)}</p></div></div>
      </div>
      <div class="receipt">
        <h3>영업 마감 정산</h3>
        <div class="row"><span>응대 손님</span><span>${stats.served}명</span></div>
        <div class="row"><span>평균 음료 점수</span><span>${stats.avgScore}점</span></div>
        <div class="row"><span>완벽한 음료</span><span>${stats.perfect}잔</span></div>
        <div class="row"><span>되묻기</span><span>${stats.questions}회</span></div>
        <hr/>
        <div class="row"><span>매출</span><span>${won(stats.sales)}</span></div>
        <div class="row"><span>팁</span><span>${won(stats.tips)}</span></div>
        <div class="row"><span>손실</span><span>-${won(stats.losses)}</span></div>
        <hr/>
        <div class="row total"><span>총점</span><span>${stats.totalScore}점</span></div>
        ${stats.easter ? `<div class="row"><span>✨ 이스터에그</span><span>${esc(stats.easter)}</span></div>` : ''}
      </div>
    </div>
    <div class="card"><h3>오늘의 손님 리뷰</h3>
      <ul class="reviews">${report.reviews.map((rv) => `<li><div class="mini">${reviewAvatar(rv)}</div><div><b>${esc(rv.name)}</b> <span class="stars">${'★'.repeat(rv.stars)}${'☆'.repeat(5 - rv.stars)}</span><br/>${esc(rv.text)}</div></li>`).join('')}</ul>
    </div>
    <div class="report-grid">
      <div class="card"><h3>명예의 전당</h3><ol class="leaderboard" id="leaderboard-report"></ol></div>
      <div class="card"><h3>EBS 캐릭터 도감 <small>${S.player.found.length}/${S.boot.characters.length}</small></h3><div class="dex" id="dex-report"></div></div>
    </div>
    <div class="report-actions">
      <button class="btn" type="button" id="btn-home">처음 화면</button>
      <button class="btn primary" type="button" id="btn-nextday">Day ${S.shift.day + 1} 영업 시작 ▶</button>
    </div>`;
  renderLeaderboard($('#leaderboard-report'), r.leaderboard);
  renderDex($('#dex-report'), S.player.found);
  $('#btn-nextday').addEventListener('click', () => startShift().catch((e) => toast(e.message)));
  $('#btn-home').addEventListener('click', async () => {
    $('#screen-report').hidden = true;
    $('#screen-title').hidden = false;
    const boot = await api('/bootstrap');
    S.boot.leaderboard = boot.leaderboard;
    renderLeaderboard($('#leaderboard-title'), boot.leaderboard);
    renderDex($('#dex-title'), S.player.found);
  });
}

// ───────── AI/DB 보기
function pushTrace(label, r) {
  if (r.order) {
    S.reviewAvatars = S.reviewAvatars ?? {};
    S.reviewAvatars[r.order.customer.id] = r.order.customer;
  }
  S.traces.unshift({ label, time: new Date(), ai: r.ai ?? [], db: r.db ?? null });
  $('#trace-count').textContent = S.traces.length;
  if (!$('#trace-drawer').hidden) renderTraces();
}

function toggleDrawer(force) {
  const drawer = $('#trace-drawer');
  const open = force ?? drawer.hidden;
  drawer.hidden = !open;
  $('#trace-toggle').setAttribute('aria-pressed', String(open));
  if (open) renderTraces();
}

function renderTraces() {
  const json = (v) => esc(JSON.stringify(v, null, 2));
  $('#trace-list').innerHTML = S.traces.length ? S.traces.map((t) => `
    <div class="trace">
      <div class="trace-head"><b>${esc(t.label)}</b><time>${t.time.toLocaleTimeString('ko-KR', { hour12: false })}</time></div>
      ${t.db ? `<div class="tr-part"><p><span class="tag db">DB·서버</span> ${esc(t.db.note ?? '')}</p>
        <details><summary>서버 데이터 보기 (정답 포함 · 스포일러)</summary><pre>${json(Object.fromEntries(Object.entries(t.db).filter(([k]) => k !== 'note')))}</pre></details></div>` : ''}
      ${t.ai.map((a) => `<div class="tr-part ai">
        <p><span class="tag ${a.source === 'ai' ? 'ai' : 'offline'}">${a.source === 'ai' ? 'AI 생성' : '오프라인 대체'}</span> <code>${esc(a.call)}</code> <small>${a.ms}ms${a.model ? ` · ${esc(a.model)}` : ''}</small></p>
        ${a.note ? `<small>${esc(a.note)}</small>` : ''}
        <details><summary>AI에게 보낸 요청</summary><pre>${esc(a.prompt)}</pre></details>
        <details open><summary>응답 JSON</summary><pre>${json(a.output)}</pre></details>
      </div>`).join('')}
    </div>`).join('') : '<p class="muted">아직 기록이 없어요. 손님을 받으면 여기에 AI 요청과 DB 데이터가 쌓여요.</p>';
}

init().catch((err) => {
  document.body.insertAdjacentHTML('afterbegin', `<p style="padding:16px;color:#b00">게임을 불러오지 못했어요: ${esc(err.message)}</p>`);
});
