// 게임 콘텐츠 원본 데이터. 서버 시작 시 DB에 시드된다.
// 레시피와 가격은 게임용 가상 데이터이며 실제 매장과 다를 수 있다.

export const STORE = {
  brand: 'EDIYA COFFEE',
  branch: 'EBS 1호점',
  address: '경기 고양시 일산동구 한류월드로 281 EBS 통합사옥 1층',
};

export const INGREDIENTS = [
  // group: base | milk | sweet | powder | topping
  { id: 'shot', name: '에스프레소 샷', short: '샷', group: 'base', color: '#4a2c1d' },
  { id: 'water', name: '정수', short: '물', group: 'base', color: '#cfe8f3' },
  { id: 'ice', name: '얼음', short: '얼음', group: 'base', color: '#e9f7fc' },
  { id: 'milk', name: '우유', short: '우유', group: 'milk', color: '#fbf6ea' },
  { id: 'oat', name: '오트밀크', short: '오트', group: 'milk', color: '#efe1c4' },
  { id: 'soy', name: '두유', short: '두유', group: 'milk', color: '#f3e8c8' },
  { id: 'vanilla', name: '바닐라 시럽', short: '바닐라', group: 'sweet', color: '#f1dc9c' },
  { id: 'hazelnut', name: '헤이즐넛 시럽', short: '헤이즐넛', group: 'sweet', color: '#c79a6b' },
  { id: 'caramel', name: '카라멜 소스', short: '카라멜', group: 'sweet', color: '#cf8a36' },
  { id: 'choco', name: '초코 소스', short: '초코', group: 'sweet', color: '#5e3522' },
  { id: 'condensed', name: '연유', short: '연유', group: 'sweet', color: '#f5ecd2' },
  { id: 'toffee', name: '토피넛 파우더', short: '토피넛', group: 'powder', color: '#c38f58' },
  { id: 'greentea', name: '녹차 파우더', short: '녹차', group: 'powder', color: '#86ad55' },
  { id: 'peach', name: '복숭아 베이스', short: '복숭아', group: 'powder', color: '#f4a585' },
  { id: 'chestnut', name: '밤 베이스', short: '밤', group: 'powder', color: '#9c6b43' },
  { id: 'whip', name: '휘핑크림', short: '휘핑', group: 'topping', color: '#ffffff' },
  { id: 'cream', name: '크림 폼', short: '크림', group: 'topping', color: '#fff4dc' },
];

// base: 게임용 기본 레시피 (L 사이즈 기준, 사이즈는 컵만 달라진다)
export const MENU = [
  { id: 'americano', name: '카페 아메리카노', category: 'COFFEE', price: 3500, temps: ['HOT', 'ICED'], base: { shot: 2, water: 1 }, sweet: null, coffee: true, milk: false, whip: false, hint: '에스프레소에 물만 탄 기본 커피' },
  { id: 'hazelnut_americano', name: '헤이즐넛 아메리카노', category: 'COFFEE', price: 4000, temps: ['HOT', 'ICED'], base: { shot: 2, water: 1, hazelnut: 2 }, sweet: 'hazelnut', coffee: true, milk: false, whip: false, hint: '아메리카노에 고소한 헤이즐넛 시럽 들어간 거' },
  { id: 'latte', name: '카페 라떼', category: 'COFFEE', price: 4200, temps: ['HOT', 'ICED'], base: { shot: 2, milk: 1 }, sweet: null, coffee: true, milk: true, whip: false, hint: '에스프레소에 우유만 들어간 부드러운 커피' },
  { id: 'vanilla_latte', name: '바닐라 라떼', category: 'COFFEE', price: 4500, temps: ['HOT', 'ICED'], base: { shot: 2, milk: 1, vanilla: 2 }, sweet: 'vanilla', coffee: true, milk: true, whip: false, hint: '우유 들어간 커피에 바닐라 시럽 넣은 달달한 거' },
  { id: 'caramel_macchiato', name: '카라멜 마끼아또', category: 'COFFEE', price: 4700, temps: ['HOT', 'ICED'], base: { shot: 2, milk: 1, vanilla: 1, caramel: 1 }, sweet: 'vanilla', coffee: true, milk: true, whip: false, hint: '바닐라 라떼 위에 카라멜 소스 뿌린 거' },
  { id: 'mocha', name: '카페 모카', category: 'COFFEE', price: 4700, temps: ['HOT', 'ICED'], base: { shot: 2, milk: 1, choco: 2, whip: 1 }, sweet: 'choco', coffee: true, milk: true, whip: true, hint: '초코 소스랑 우유 들어간 커피에 휘핑 올라간 거' },
  { id: 'condensed_latte', name: '연유 라떼', category: 'COFFEE', price: 4500, temps: ['HOT', 'ICED'], base: { shot: 2, milk: 1, condensed: 2 }, sweet: 'condensed', coffee: true, milk: true, whip: false, hint: '연유 넣어서 달달한 커피 라떼' },
  { id: 'toffeenut_latte', name: '토피넛 라떼', category: 'COFFEE', price: 4700, temps: ['HOT', 'ICED'], base: { shot: 1, milk: 1, toffee: 2, whip: 1 }, sweet: 'toffee', coffee: true, milk: true, whip: true, hint: '토피넛 가루 들어간 고소한 라떼에 휘핑 올린 거' },
  { id: 'choco_latte', name: '초콜릿 라떼', category: 'BEVERAGE', price: 4200, temps: ['HOT', 'ICED'], base: { milk: 1, choco: 2 }, sweet: 'choco', coffee: false, milk: true, whip: true, whipDefault: false, hint: '커피 없이 우유에 초코 소스 넣은 거' },
  { id: 'greentea_latte', name: '녹차 라떼', category: 'BEVERAGE', price: 4200, temps: ['HOT', 'ICED'], base: { milk: 1, greentea: 2 }, sweet: 'greentea', coffee: false, milk: true, whip: false, hint: '커피 없이 우유에 녹차 가루 넣은 초록색 음료' },
  { id: 'peach_icedtea', name: '복숭아 아이스티', category: 'BLENDING TEA', price: 3700, temps: ['ICED'], base: { peach: 2, water: 1 }, sweet: 'peach', coffee: false, milk: false, whip: false, hint: '복숭아 맛 나는 시원한 아이스티' },
  { id: 'chestnut_cream_latte', name: '밤 크림 라떼', category: 'SEASON', price: 5200, temps: ['HOT', 'ICED'], base: { milk: 1, chestnut: 2, cream: 1 }, sweet: 'chestnut', coffee: false, milk: true, whip: false, hint: '요즘 가을 시즌 메뉴요, 밤 들어가고 위에 크림 얹은 라떼' },
];

export const EX_SURCHARGE = 700;

export const POLICIES = [
  { key: 'max_shots', value: 4, title: '샷 한도', text: '음료 1잔에 에스프레소 샷은 최대 4개까지' },
  { key: 'free_remake', value: 'store_mistake', title: '무료 재제조', text: '매장 실수로 잘못 만든 경우에만 무료로 다시 제조' },
  { key: 'size_up', value: 'paid', title: '사이즈 업', text: 'L → EX 변경은 700원 추가 (무료 제공 불가)' },
  { key: 'refund', value: 'store_mistake', title: '환불', text: '제조 전 취소, 또는 매장 실수인 경우에만 환불' },
  { key: 'stamp_goal', value: 10, title: '스탬프', text: '음료 1잔당 1개, 10개를 모으면 음료 1잔 무료' },
  { key: 'discount', value: 'none', title: '할인', text: '직원 재량 할인 불가 (제휴 할인은 POS에서 자동 적용)' },
];

// 가상의 오늘 사옥 일정 (시간 = 게임 속 시계)
export const SCHEDULE = [
  { time: '09:00', title: '아침 편성 회의', place: '대회의실' },
  { time: '09:30', title: '수능특강 강의 녹화', place: '스튜디오 C' },
  { time: '10:00', title: '딩동댕 유치원 녹화', place: '스튜디오 A' },
  { time: '10:30', title: '자이언트 펭TV 촬영', place: '로비·야외' },
  { time: '11:00', title: '라디오 생방송', place: '라디오 부스' },
  { time: '11:30', title: '다큐프라임 편집 시사', place: '시사실' },
];

// avatar: 화면에 그리는 SVG 인물 사양
// prefs: 주문을 만들 때 쓰는 취향 (확률적으로 반영)
export const CUSTOMERS = [
  // ── 일반·단골 손님 (가상 인물)
  {
    id: 'kim_pd', kind: 'regular', name: '김도윤', job: '편성팀 PD',
    personality: '늘 바쁘고 급하다. 회의에 쫓겨 산다. 속은 착하다.',
    speech: '말이 빠르고 줄임말을 쓴다. "아아", "샷추" 같은 표현. 문장이 짧다.',
    favorites: ['americano', 'hazelnut_americano'], prefs: { temp: 'ICED', extraShot: true },
    avatar: { skin: '#f0c9a8', hair: 'short', hairColor: '#1f1a17', top: '#2f3b4c', acc: ['glasses'] },
    offline: { hello: ['아 사장님, 빨리요 빨리.', '회의 5분 전이에요, 급해요!'], good: ['오 굿굿. 살았다.', '역시 여기밖에 없어요.'], bad: ['어… 이거 제가 시킨 거 맞아요?', '아 바쁜데… 뭔가 다르네요.'] },
  },
  {
    id: 'han_writer', kind: 'regular', name: '한서연', job: '라디오 작가',
    personality: '감성적이고 다정하다. 오늘의 날씨와 기분을 음료에 비유한다.',
    speech: '문학적인 비유를 섞어 부드럽게 말한다. "~한 느낌으로요" 같은 표현.',
    favorites: ['vanilla_latte', 'caramel_macchiato', 'chestnut_cream_latte'], prefs: { temp: 'HOT' },
    avatar: { skin: '#f6d3b8', hair: 'long', hairColor: '#4a2e22', top: '#c98b8b', acc: ['earring'] },
    offline: { hello: ['오늘 원고가 잘 안 풀려서요… 달달한 위로가 필요해요.', '창밖이 가을 느낌이네요.'], good: ['음, 오늘 원고 첫 문장이 떠오를 것 같아요.', '딱 제가 상상한 맛이에요.'], bad: ['음… 제가 떠올린 맛이랑은 조금 다르네요.', '오늘은 문장이 좀 쓰게 나오겠어요.'] },
  },
  {
    id: 'park_announcer', kind: 'regular', name: '박준호', job: '아나운서',
    personality: '예의 바르고 꼼꼼하다. 목 관리에 신경을 많이 쓴다.',
    speech: '또박또박 정중한 존댓말. "~해 주시겠습니까?" 같은 표현.',
    favorites: ['greentea_latte', 'latte'], prefs: { temp: 'HOT', milk: 'oat' },
    avatar: { skin: '#f3cdb0', hair: 'short', hairColor: '#2a211c', top: '#1d2b44', acc: ['tie'] },
    offline: { hello: ['안녕하십니까. 오늘도 잘 부탁드립니다.', '곧 녹음이 있어서 목을 좀 챙기려고 합니다.'], good: ['감사합니다. 목이 편안해지네요.', '완벽합니다. 좋은 하루 되십시오.'], bad: ['아, 제가 주문드린 것과 조금 다른 것 같습니다.', '실례지만 한번 확인해 주시겠습니까?'] },
  },
  {
    id: 'lee_ad', kind: 'regular', name: '이하늘', job: '신입 AD',
    personality: '입사 3개월 차. 긴장을 많이 하고 선배 심부름이 잦다.',
    speech: '"저, 저기…" 하며 더듬고, 선배 이야기를 자주 한다.',
    favorites: ['mocha', 'peach_icedtea', 'choco_latte'], prefs: {},
    avatar: { skin: '#f7d6bd', hair: 'pony', hairColor: '#3b2a20', top: '#6b8f71', acc: ['headset'] },
    offline: { hello: ['저, 저기… 안녕하세요!', '선배님이 빨리 사 오라고 하셔서요…!'], good: ['헉 감사합니다! 오늘 안 혼나겠다…', '와 맛있어요, 저 이제 버틸 수 있어요.'], bad: ['어… 이거 선배님이 싫어하실 것 같은데…', '저, 제가 잘못 말했나요…?'] },
  },
  {
    id: 'choi_planner', kind: 'regular', name: '최민정', job: '교육콘텐츠 기획자',
    personality: '논리적이고 체계적이다. 당 섭취를 관리한다.',
    speech: '"첫째, 둘째" 하며 번호를 매겨 말한다. 요점만 말한다.',
    favorites: ['toffeenut_latte', 'condensed_latte', 'latte'], prefs: { sweet: 'less' },
    avatar: { skin: '#efc6a6', hair: 'bob', hairColor: '#1b1614', top: '#e6e1d6', acc: ['glasses'] },
    offline: { hello: ['주문 정리해서 말씀드릴게요.', '회의 전에 빠르게 부탁드려요.'], good: ['정확합니다. 좋네요.', '요구사항 100% 충족이에요.'], bad: ['요구사항과 결과물이 불일치하네요.', '확인이 필요할 것 같아요.'] },
  },
  {
    id: 'jung_camera', kind: 'regular', name: '정태식', job: '촬영감독',
    personality: '무뚝뚝하지만 정이 많다. 새벽부터 촬영 중이다.',
    speech: '단답형. "그거.", "응." 같은 짧은 말. 존댓말은 반쯤.',
    favorites: ['americano', 'latte'], prefs: { size: 'EX' },
    avatar: { skin: '#d9a57f', hair: 'buzz', hairColor: '#3a3a3a', top: '#3d4a3a', acc: ['cap'] },
    offline: { hello: ['…수고해요.', '…커피 좀.'], good: ['어. 좋네.', '…고마워요.'], bad: ['…이거 아닌데.', '음.'] },
  },
  {
    id: 'yoon_teacher', kind: 'regular', name: '윤지후', job: '수능 강의 강사',
    personality: '에너지가 넘치는 인기 강사. 모든 걸 강의하듯 설명한다.',
    speech: '"자, 여기서 중요한 포인트!" 같은 강의 말투. 밑줄 긋듯 강조한다.',
    favorites: ['condensed_latte', 'caramel_macchiato'], prefs: { sweet: 'more' },
    avatar: { skin: '#f2cba9', hair: 'short', hairColor: '#35261c', top: '#f2f2f2', acc: ['mic'] },
    offline: { hello: ['자, 여러분! 아니 사장님! 주문 들어갑니다!', '녹화 들어가기 전에 당 충전 필수죠!'], good: ['자, 이게 바로 정답입니다! 별표 다섯 개!', '완벽해요, 오늘 강의 잘 되겠네요.'], bad: ['자, 여기서 오답 체크 들어갑니다!', '음~ 이건 함정 문제에 걸리셨네요.'] },
  },
  {
    id: 'oh_guard', kind: 'regular', name: '오만석', job: '보안실 반장',
    personality: '사옥의 터줏대감. 모두와 친하고 구수하다.',
    speech: '구수한 경상도 사투리. "~아이가", "마" 같은 표현. 친근하다.',
    favorites: ['choco_latte', 'americano'], prefs: { temp: 'HOT', sweet: 'more' },
    avatar: { skin: '#d8a27c', hair: 'bald', hairColor: '#777', top: '#27344d', acc: ['cap_guard'] },
    offline: { hello: ['어이 사장님, 오늘도 수고 많제?', '마, 오늘도 한 잔 도.'], good: ['캬, 이 맛이지!', '역시 우리 사장님 솜씨 최고 아이가.'], bad: ['어라, 이거 맛이 쫌 다르네?', '마, 오늘 컨디션 안 좋나?'] },
  },

  // ── 진상 손님 (가상 인물)
  {
    id: 'byun_sponsor', kind: 'nuisance', nuisance: 'change', name: '변덕희', job: '외부 협찬사 직원',
    personality: '결정을 못 하고 계속 마음이 바뀐다. 악의는 없지만 피곤하다.',
    speech: '"아 잠깐만요", "아니다" 를 입에 달고 산다.',
    favorites: ['latte', 'vanilla_latte', 'americano'], prefs: {},
    avatar: { skin: '#f4cfb2', hair: 'bob', hairColor: '#7a4b2a', top: '#b64f5a', acc: ['earring'] },
    offline: { hello: ['음… 뭐 마시지… 일단 이걸로요.'], good: ['오 괜찮네요. 다음엔 또 바꿀지도요.'], bad: ['어? 제가 이거 시켰었나…?'] },
  },
  {
    id: 'go_editor', kind: 'nuisance', nuisance: 'insist', name: '고집남', job: '외주 편집자',
    personality: '자기 기억이 무조건 맞다고 믿는다. 밤샘 편집으로 예민하다.',
    speech: '"제가 분명히~", "기억 안 나세요?" 하며 따지는 말투. 반말이 섞인다.',
    favorites: ['americano', 'latte', 'mocha'], prefs: {},
    avatar: { skin: '#e8bb98', hair: 'short', hairColor: '#111', top: '#444', acc: ['glasses'] },
    offline: { hello: ['빨리 좀 주세요. 편집 걸어두고 나왔어요.'], good: ['…됐네요.'], bad: ['아니 이게 뭐예요.'] },
  },
  {
    id: 'na_vip', kind: 'nuisance', nuisance: 'fake_regular', name: '나단골', job: '자칭 사옥 VIP',
    personality: '실제보다 자주 온다고 과장하며 서비스를 바란다.',
    speech: '"나 여기 매일 오잖아~" 같은 능청스러운 반말.',
    favorites: ['caramel_macchiato', 'vanilla_latte'], prefs: {},
    avatar: { skin: '#f1c7a2', hair: 'long', hairColor: '#c7a15a', top: '#d9b44a', acc: ['sunglasses'] },
    startState: { visits: 3, stamps: 3 },
    offline: { hello: ['나 여기 매일 오잖아~ 서비스로 사이즈업 좀 해줘!'], good: ['오케이~ 다음엔 서비스 꼭!'], bad: ['에이 뭐야~'] },
  },
  {
    id: 'moo_writer', kind: 'nuisance', nuisance: 'unreasonable', name: '무리수', job: '밤샘 중인 예능 작가',
    personality: '사흘째 밤샘 중. 카페인에 집착한다.',
    speech: '피곤에 절은 말투. 과장이 심하다. "죽을 것 같아요".',
    favorites: ['americano'], prefs: { temp: 'ICED' },
    avatar: { skin: '#e9c3a4', hair: 'messy', hairColor: '#2b2b2b', top: '#6a5acd', acc: ['darkcircle'] },
    offline: { hello: ['샷… 샷 6개요… 저 사흘째 못 잤어요…'], good: ['살았다… 감사합니다…'], bad: ['아… 이걸로 버틸 수 있을까…'] },
  },
  {
    id: 'geup_fd', kind: 'nuisance', nuisance: 'rush', name: '급하다', job: '생방송 5분 전 FD',
    personality: '생방송 큐 사인 직전이라 초조하다. 반말이 튀어나온다.',
    speech: '"아직이야?", "빨리빨리" 반말과 재촉. 짧게 끊어 말한다.',
    favorites: ['americano', 'latte', 'peach_icedtea'], prefs: { temp: 'ICED' },
    avatar: { skin: '#efc4a0', hair: 'short', hairColor: '#231a14', top: '#111', acc: ['headset'] },
    offline: { hello: ['빨리요, 5분 뒤 큐 들어가요!'], good: ['오케이 땡큐!'], bad: ['아 뭐야, 됐어 그냥 가져갈게.'] },
    rushOffline: ['아직이야?', '빨리요 빨리, 큐 들어간다고요!', '3분 남았어요!!'],
  },
  {
    id: 'hwan_manager', kind: 'nuisance', nuisance: 'refund', name: '환불해', job: '출연자 매니저',
    personality: '까다롭고 손해 보는 걸 싫어한다.',
    speech: '정중한 척하지만 은근히 압박하는 말투. "~되죠?"',
    favorites: ['vanilla_latte', 'latte', 'caramel_macchiato'], prefs: {},
    avatar: { skin: '#f3d0b5', hair: 'bob', hairColor: '#221915', top: '#1f1f1f', acc: ['sunglasses_head'] },
    offline: { hello: ['출연자분 거예요. 제대로 부탁드려요.'], good: ['네, 감사합니다.'], bad: ['이거 확인 좀 해주시겠어요?'] },
  },

  // ── EBS 캐릭터 이스터에그 (팬 헌정용 패러디 대사, 공식 설정과 다를 수 있음)
  {
    id: 'pengsoo', kind: 'easter', name: '펭수', job: 'EBS 연습생 (자이언트 펭TV)',
    personality: '남극에서 온 10살 펭귄 연습생. 당당하고 거침없고 유쾌하다. 커피는 아직 어려서 안 마신다.',
    speech: '"펭-하!" 로 인사한다. 당당한 반존대. 자신감 넘치는 말. 실존 인물 실명은 쓰지 않는다.',
    favorites: ['choco_latte', 'peach_icedtea'], prefs: { temp: 'ICED' }, noCoffee: true,
    emoji: '🐧', color: '#2b4a8b',
    offline: { hello: ['펭-하! 촬영 쉬는 시간이라 왔습니다!', '펭-하! 저 아시죠? 당연히 아시겠죠!'], good: ['펭-바! 최고예요, 남극 친구들한테 자랑할게요!'], bad: ['음~ 이건 좀 아쉽네요. 그래도 괜찮아요, 사람은 실수하면서 크는 거예요!'] },
  },
  {
    id: 'ttukddak', kind: 'easter', name: '뚝딱이', job: '딩동댕 유치원 원조 친구',
    personality: '오랫동안 어린이들의 친구였던 다정한 캐릭터. 호기심이 많다.',
    speech: '밝고 다정한 말투. 어린이에게 말하듯 친절하다.',
    favorites: ['choco_latte', 'greentea_latte'], prefs: { temp: 'HOT', sweet: 'more' }, noCoffee: true,
    emoji: '🧡', color: '#e0782f',
    offline: { hello: ['안녕하세요! 녹화 끝나고 친구들이랑 나눠 마시려고요!'], good: ['우와, 정말 맛있어요! 고마워요!'], bad: ['어라? 조금 다른 맛이 나요. 그래도 괜찮아요!'] },
  },
  {
    id: 'beongaeman', kind: 'easter', name: '번개맨', job: '모여라 딩동댕의 히어로',
    personality: '정의롭고 씩씩한 히어로. 모든 걸 임무처럼 말한다.',
    speech: '"번개 파워!" 같은 힘찬 영웅 말투. 느낌표가 많다.',
    favorites: ['choco_latte', 'peach_icedtea'], prefs: { size: 'EX' }, noCoffee: true,
    emoji: '⚡', color: '#d4a017',
    offline: { hello: ['번개 파워! 에너지 충전이 필요하다!'], good: ['번개처럼 빠르고 정확하군! 고맙다, 시민이여!'], bad: ['음, 이번 임무는 조금 어긋났지만 포기하지 않는다!'] },
  },
  {
    id: 'bbungbbung', kind: 'easter', name: '뿡뿡이', job: '방귀대장',
    personality: '장난꾸러기 방귀대장. 늘 신나 있다.',
    speech: '말끝에 "뿡!"을 붙인다. 신나고 장난스럽다.',
    favorites: ['peach_icedtea', 'choco_latte'], prefs: { sweet: 'more' }, noCoffee: true,
    emoji: '💨', color: '#e46b9a',
    offline: { hello: ['안녕 뿡! 달콤한 거 마시고 싶어 뿡!'], good: ['신난다 뿡! 최고야 뿡뿡!'], bad: ['어라 뿡? 맛이 좀 이상해 뿡…'] },
  },
  {
    id: 'jjajanhyung', kind: 'easter', name: '짜잔형', job: '뿡뿡이의 단짝 형',
    personality: '밝고 자상한 형. 놀이를 좋아한다.',
    speech: '"짜잔!" 하고 등장한다. 밝고 친절한 말투.',
    favorites: ['greentea_latte', 'choco_latte'], prefs: {}, noCoffee: true,
    emoji: '🎉', color: '#3a9d5d',
    offline: { hello: ['짜잔! 뿡뿡이 몰래 하나 사러 왔어요!'], good: ['짜잔! 완벽해요, 고마워요!'], bad: ['어? 짜잔… 이 아니라 조금 다르네요?'] },
  },
];
