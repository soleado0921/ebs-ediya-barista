# 🎬 소개 영상 (Remotion)

EBS 이디야 바리스타를 소개하는 약 60초짜리 영상(1920×1080, 30fps)을 [Remotion](https://www.remotion.dev)으로 만듭니다.
실제 게임을 자동으로 한 판 플레이하며 찍은 캡처에 커서 이동, 화면 확대, 자막을 입혀 완성합니다.

| # | 장면 | 내용 |
|---|---|---|
| 1 | 인트로 | 커피컵 애니메이션과 제목 |
| 2 | 도입 | 시작 화면에서 이름 입력 후 영업 시작 |
| 3 | ① 듣기 | DB 정답이 AI 대사로 바뀌는 모습 (손님 3명) |
| 4 | ② 만들기 | 컵 선택과 재료 넣기 (제조대 확대) |
| 5 | ③ 채점 | 결과 비교표와 감점 규칙, EBS 캐릭터 손님 |
| 6 | ④ 응대 | 주문 변경, 가짜 단골 응대 (근거 확인 후 S등급) |
| 7 | 핵심 원칙 | 정답은 DB가 정하고, 말은 AI가 한다 + AI/DB 보기 |
| 8 | 마무리 | 마감 리포트 통계, 플레이 주소, GitHub |

## 만들기

게임 서버가 `http://localhost:3000`에서 실행 중이어야 하고, 녹화에는 PC에 설치된 Chrome을 씁니다.

```bash
cd video
npm install
npm run fonts     # Noto Sans KR 폰트 내려받기 (public/fonts/)
npm run record    # 시연 모드로 한 판 자동 플레이 → public/rec/ 캡처 + manifest.json
npm run studio    # 미리보기 (브라우저)
npm run render    # out/intro.mp4 렌더링
```

- `npm run stills -- 300 900`: 지정한 프레임만 PNG로 뽑아 검수합니다 (`out/stills/`).
- README 상단 GIF(`docs/intro.gif`, 720px · 8fps · 약 9MB)는 렌더링한 mp4를 ffmpeg로 변환해 만듭니다. Remotion에 들어 있는 ffmpeg에는 `fps` 필터가 없어서 일반 ffmpeg를 씁니다.
  ```bash
  ffmpeg -i out/intro.mp4 -vf "fps=8,scale=720:-1:flags=lanczos,palettegen=max_colors=128:stats_mode=diff" out/palette.png
  ffmpeg -i out/intro.mp4 -i out/palette.png -lavfi "fps=8,scale=720:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle" ../docs/intro.gif
  ```
- 녹화할 때마다 AI 대사가 달라지고, 장면은 `manifest.json`을 읽어 자동으로 구성됩니다 (`src/timeline.ts`).
- `public/rec/`, `public/fonts/`, `out/`은 용량 때문에 저장소에 올리지 않습니다.

## 파일

```
scripts/record.mjs   게임 자동 플레이 + 캡처·클릭 좌표 기록
scripts/fonts.mjs    폰트 내려받기
scripts/stills.mjs   검수용 프레임 추출
src/Root.tsx         장면 순서와 전환
src/scenes.tsx       8개 장면
src/components.tsx   브라우저 창, 캡처 재생(카메라·커서), 자막
src/timeline.ts      캡처 목록 → 장면별 단계와 길이
```

> Remotion은 개인과 직원 3명 이하 회사는 무료이며, 그보다 큰 회사는 [회사 라이선스](https://www.remotion.dev/license)가 필요합니다.
