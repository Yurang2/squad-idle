# squad-idle — 구현 규칙 (모든 에이전트 공통)

기획서는 `GAME_DESIGN.md`. 기획서와 충돌하면 기획서가 우선. 모호하면 기획서의 취지(뽑기 재미, 오프라인 수확)에 맞게 결정하고 코드 주석에 "DECISION:"으로 남긴다.

## 스택
- 순수 HTML/CSS/JS. **빌드 도구 없음, 프레임워크 없음, npm 의존성 없음.** `index.html`을 정적 서버로 열면 바로 돌아가야 한다.
- 클래식 `<script>` 태그 순서 로딩 (ES module 아님). 전역 네임스페이스는 아래 4개만:
  - `DATA` (`js/data.js`) — 모든 콘텐츠/밸런스 상수. 함수 없음, 순수 데이터 + 스케일 공식 함수 몇 개.
  - `Game` (`js/game.js`) — 상태와 로직. DOM 접근 금지. 렌더에는 `Game.on(event, fn)` 이벤트로만 통지.
  - `Battle` (`js/battle.js`) — 전투 시뮬레이션 (틱 기반, 10Hz). DOM 접근 금지.
  - `UI` (`js/ui.js`) — DOM/SVG 렌더와 입력. `Game`/`Battle`의 공개 API만 호출.
- 스타일은 `style.css` 하나. 기준 뷰포트 390×844 세로. `#app`을 `max-width: 480px` 중앙 정렬, 그 이상은 좌우 여백.
- 한국어 UI. 이모지는 아이콘 대용으로 허용.

## 코드 규칙
- 결정적(deterministic) 랜덤: `Game.rng()` 하나만 사용 (시드 저장 가능하게). `Math.random()` 직접 호출 금지.
- 저장은 `Game.save()`/`Game.load()`만. `localStorage` 키 `squad_v1`. 저장 객체에 `schemaVersion` 필수.
- 숫자 표시는 `UI.fmt(n)` 하나로 통일 (1234 → "1,234", 12345 → "12.3K", 1.2M ...).
- 애니메이션은 CSS 클래스 토글 또는 `requestAnimationFrame`. 전투 틱은 `setInterval` 100ms이며 탭이 숨겨지면 멈추고, 돌아오면 경과 시간을 `Game.catchUp(elapsedMs)`로 처리한다.
- 파일 크기 상한: 파일 하나 600줄. 넘으면 쪼갠다 (예: `ui.js` → `ui.js` + `ui-sheets.js`).
- 콘솔 에러 0. 작업 끝에 `node --check js/*.js`로 문법 확인.

## 작업 방식
- 요청받은 단계(P1/P2/P3)만 구현한다. 다음 단계 것을 미리 만들지 않는다.
- 기존 파일을 수정할 때는 구조를 유지하고, 함수 이름을 바꾸지 않는다.
- 끝나면 `CHANGELOG.md`에 이번 작업으로 생긴 파일/함수/결정 사항을 짧게 적는다.
- 테스트: `test/` 폴더에 node로 실행 가능한 순수 로직 테스트 (`node test/run.js`). DOM 없는 `Game`/`Battle`/`DATA`만 대상. 최소한 전투 시뮬이 스테이지 1-1을 클리어하는지, 저장/로드 왕복이 동일한지 확인.
