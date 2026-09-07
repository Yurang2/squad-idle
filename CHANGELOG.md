# 변경 기록

## 0.2.0 · P2 — 2026-09-07

- `js/data.js`: 장비 4슬롯·8티어·4등급 확정, 방어력 잠재 추가, 스테이지 6구간 드롭표와 카오스용 데이터 자리, `fusionCost()`·`sellPrice()`, 합성 상승 15%·재설정 20코인·인벤토리 60칸 상수.
- `js/game-equipment.js`: DOM 없는 장비 확장. `Game.rollItem(stageIndex, {forcedTier})`, `equip(uid, mercenaryId)`, `unequip(mercenaryId, slot)`, `fuse(uids)`, `autoFuse()`, `sell(uids)`, `toggleLock(uid)`, `rerollPotentials(uid)`. 드롭·합성·재설정·인벤토리 포화 이벤트와 저장 검증 포함. 외부에 반환하는 아이템은 복사본.
- `js/game.js`·`js/battle.js`: `Game.mercenaryStats(id)`와 CP·현재 전투에 장비 반영, 처치 시 드롭/골드 잠재 적용. 기존 함수 이름과 10Hz 전투 구조 유지. 저장 키는 `squad_v1`, 봉투와 상태의 `schemaVersion`은 2. v1은 빈 인벤토리·용병별 빈 4슬롯·UID 순번·overflow를 추가하여 이전 전투까지 복원.
- `js/ui-equipment.js`·`js/ui.js`·`style.css`: 적 위치에서 튀고 장비 탭으로 날아가는 카드, 신규 드롭 배지, 유니크 이상 테두리 플래시·가능 시 30ms 진동. 6열 인벤토리·슬롯 필터·3종 정렬·상세·장착/해제·잠금/판매·잠재 재설정 전후 공개, 용병 슬롯에서 지정 용병 장착 모드로 이동, CP 500ms 카운트업. 슬롯×티어 합성표·단일/자동 합성·뒤집기·250ms 순차 공개·탭 건너뛰기·등급 상승 강조.
- `index.html`: 기존 클래식 스크립트 순서에 장비 로직/UI 확장 추가. 전역은 DATA/Game/Battle/UI 네 개, 외부 의존성 없음. `UI.init()`은 확장 등록이 끝난 뒤 실행.
- `test/run.js`: 기존 17개 검증 유지(버전/빈 인벤토리 기대값만 P2로 갱신), 장비 검증 11개 추가. `test/browser-equipment.js`와 기존 `test/browser.js`에 실제 브라우저 P2 검증 추가. `test/balance.js`는 20개 시드의 15분 장착 플레이를 재현.

### DECISION: 장비·보상 규칙

- 슬롯 기본값: 무기 ATK **4**(P1 스텁 10에서 하향), 모자 HP 30, 장갑 ATK 2 + 치명타 확률 1%, 신발 HP 15 + DEF 3. 각 기본값에 `1.6^(tier-1) × 등급 배율`을 적용하고 소수 넷째 자리까지 저장. 장갑 치명타도 같은 공식으로 성장하되 최종 치명타 확률은 100% 상한.
- 일반 처치 드롭률은 8%. 보스 구간의 일반 적도 8%이며 **보스 개체 처치만 100%**, 1-10/2-10/3-10은 각각 T2/T3/T4 정확히 확정. 일반 구간 티어는 지역별 T1~2 / T2~4 / T3~5. `forcedTier`는 생성 시 1~8 범위의 명시적 덮어쓰기이며, 카오스 표는 P3용 데이터만 존재.
- 잠재옵션은 중복 줄 허용. 같은 종류의 비율은 합산 후 장비 기본값까지 더한 스탯에 곱함. 치명타 확률/피해는 가산. 골드·드롭 잠재는 쓰러진 동료를 포함한 합류 용병의 장착분을 합산하고 획득량/8% 드롭률에 상대 배율로 적용. `invincibleOnHit`는 저장·재추첨만 하며 실제 무적 효과는 **P3**로 보류(화면에 효과 준비 중 표시).
- 장착·해제·장착 장비 재설정은 현재 전투에 즉시 반영하되 **HP 비율과 공격 대기 진행률 유지**, 쓰러진 용병 부활 없음. 잠금은 판매/합성 보호이며 장착과 잠재 재설정은 가능. 다른 용병에게 이동 시 이전 슬롯을 비움.
- **60칸 포화 시에도 이번 처치의 드롭을 생성하고 `itemDrop`·`inventoryFull`을 모두 발행하며 `overflow`를 증가.** 새 드롭을 포함한 잠금/장착되지 않은 레어 중 최저 티어를 자동 판매(동률이면 오래된 UID 우선). 판매 가능한 레어가 전혀 없으면 새 드롭을 해당 등급의 판매가로 환전. 잠금·장착·기존 상위 등급 장비는 보존하며, 판매 이름/골드를 알림으로 표시하여 조용한 손실을 방지.
- 판매가는 `20 × 2^(tier-1) × 등급 계수(1/2/4/8)`. 일괄 판매는 누락·중복·보호 아이템이 하나라도 있으면 전부 거부. 합성은 같은 슬롯·티어의 서로 다른 3개만 허용, T8은 합성 불가. 자동 합성은 가장 낮은 티어부터 재검색하여 연쇄 합성하고 골드가 부족하면 남김. 반환 결과에는 이후 합성에 사용된 중간 결과도 생성 순서대로 포함.
- 배지는 이번 세션에서 아직 장비 탭으로 확인하지 않은 보관 드롭 수. 합성 결과는 첫 탭으로 모두 공개, 다음 탭으로 닫기. 빠르게 닫고 다시 열어도 이전 dialog 닫기 이벤트가 새 결과 연출을 취소하지 않도록 보호.
- P1의 최대 60초 `catchUp()` 시뮬레이션 경계는 유지하며 중간 연출 없이 같은 장비 로직을 적용. 오프라인 보고서·스킬·카오스 모드/상점·JSON 내보내기는 추가하지 않음.

### 검증

- 모든 `js/*.js`에 `node --check` 통과(Windows PowerShell에서 파일별 실행), `node test/run.js`: **28 PASS**, 종료 코드 0. 전체 작성 파일은 600줄 미만, `git diff --check` 통과.
- 각 드롭 구간 2,000회(총 12,000회) 생성으로 티어/보스 보장/잠재 범위 확인. 실제 5,000회 합성 상승률 **15.54%**. 합성 재료/비용/연쇄/상한, CP 장착 왕복, 모든 P2 잠재 효과, 판매/잠금/재설정, v1→v2와 장착 저장 왕복·손상 거부, 60칸 자동 판매와 전량 보호 시 환전 검증.
- Chrome 152 실제 100ms 타이머의 새 게임 **120초에 장비 5개**, 드롭 팝·배지 확인. 375px 6열 그리드와 장착 CP 상승·용병 슬롯 연동, T1→T2 뒤집기·자동 결과 순차 공개/건너뛰기, 유니크→레전더리 강한 플래시, 잠재 전후 공개·잠금, 재접속 저장 검증. 가로 넘침 없음(375px 시트 포함; 기존 320px/480px 최대 폭 검증 유지), **브라우저 콘솔·런타임 오류 0**.
- 테스트 환경의 기본 Chrome/Edge renderer가 시작 시 충돌하여 격리된 임시 프로필의 테스트 실행에만 `BROWSER_NO_SANDBOX=1`을 사용. PowerShell 실행: `$env:BROWSER_NO_SANDBOX='1'; node test/browser.js`. 실제 120초 드롭 확인 후 연출 수정 재검증에는 `BROWSER_FAST=1`로 동일한 1,200틱을 재생했으며 전체 브라우저 테스트 종료 코드 0. 앱/사용자 브라우저 설정 변경 없음. OS 진동 하드웨어의 실제 촉각 반응은 headless 검증 대상이 아님.
- 밸런스: 20개 시드, 10초마다 CP가 오르는 드롭 장착, 15분간 플레이. **1-6: 123~167.9초, 1-8: 156~213.4초(중앙값 176.4초), 모두 20/20 통과**. 1-10은 229.9~650.9초. 무기 기본 ATK를 스텁 10→4로 줄이고 드롭률은 8% 유지. P1의 장비 없는 대조군 5개 시드도 XP 성장으로 1-8을 209.5~363.1초에 통과하므로, P1 성장을 바꾸지 않고 15분 이내 돌파를 보장하는 방향으로 결정. 15분에 근접한 정체 구간을 강제로 만들지는 않음.

## 0.1.0 · P1 — 2026-09-07

- `index.html`, `style.css`: 한국어 모바일 세로 UI, 중앙 최대 480px 레이아웃, HUD·타이머·SVG 숲 전투·HP·피해 숫자·공격/피격/사망 연출, 스테이지 이동과 반복/도전 토글, 하단 탭/모달 시트. 용병 카드에 레벨·경험치·6종 스탯·빈 장비 4칸 표시. 설정에 버전·schemaVersion·확인 후 초기화 제공.
- `js/data.js`: 용병 3종, 지역 3개·스테이지 30개·몬스터 팔레트·웨이브·보스, `enemyScale()`, `goldPerKill()`, `xpToNext()`, `mercenaryStats()`, CP 가중치. P2용 장비 슬롯·티어 8개·등급 4개·잠재 옵션 8종은 데이터만 추가.
- `js/battle.js`: `Battle.start()/tick()`의 DOM 없는 10Hz 시뮬레이션. 선봉 우선 공격, 치명타·방어·사망·3웨이브·보스·60초 제한 및 `wave/hit/kill/unitDeath/stageClear/stageFail` 이벤트. 유닛의 `skills`는 비어 있는 확장 자리만 마련.
- `js/game.js`: 결정적 `rng()`, `on()`, `getState()/getCP()`, `selectStage()/setMode()`, 처치 보상·XP·레벨·궁수/마법사 해금, 반복·자동 진행·실패 재시도. `save()/load()`는 `squad_v1`에 schemaVersion 1과 전체 전투 상태를 저장하고 잘못된 세이브를 거부. `init()/resume()/pause()/step()/catchUp()/reset()`과 3초 자동 저장, 최근 5분 골드/처치 통계 제공.
- `js/ui.js`: `UI.init()/fmt()`와 이벤트 기반 SVG/DOM 렌더링. 탭을 숨기거나 페이지를 떠날 때 타이머를 중지하고 복귀 시 경과 시간을 처리. 장비/합성/스킬은 “준비 중” 시트만 제공.
- `test/run.js`: Node 내장 모듈만 쓰는 순수 로직 테스트 17개. 요청한 클리어/스케일링/저장 왕복/RNG 재현성 외에 실제 초기 진행·보상·해금·웨이브·선봉·치명타·타임아웃·재시도·복귀 상한·CP·통계·손상 저장·타이머·데이터 검증 포함.
- `test/browser.js`: 별도 패키지 없이 설치된 Chrome/Edge와 Node 22+로 실행하는 선택적 브라우저 스모크 테스트. 임시 프로필과 로컬 정적 서버를 만들며 레이아웃·탭·초기화 확인·실시간 진행·저장·콘솔 오류를 검사. 실행: `node test/browser.js` (`CHROME_PATH`로 실행 파일 지정 가능).

### DECISION: 기획서의 미지정 값과 P1 경계

- 기본 전사 HP/ATK/DEF/초당 공격/치명타/치명타 피해는 `170/14/12/0.85/8%/150%`. 궁수는 `140/12/5/1.4/15%/175%`, 마법사는 `115/23/3/0.7/10%/150%`. 전사만 합류한 상태에서 기본 도전 모드로 시작하고, 잠긴 동료는 전투 장면에 흐린 실루엣으로 표시.
- 초기 실험의 전사 HP 260, 처치 XP 5는 너무 빠르게 1지역을 통과하여 HP **170**, 처치 XP **2**로 조정. 기본 시드 `271828`에서 레벨 1 전사는 1-1을 **18.9초**에 클리어하고 1-5까지 클리어, 1-6 실패. 자동 XP를 포함한 자연 진행도 첫 실패가 1-6이며 재시도 XP로 결국 돌파 가능. 적 HP `20 × 1.22^index`, ATK `3 × 1.18^index`, 골드 `5 × 1.2^index`, 레벨업 XP `ceil(50 × 1.15^level)`의 형태와 초기값은 유지.
- HP·공격력·방어력에 레벨당 5% 복리 성장 적용. 속도·치명타 수치는 고정. 경험치는 쓰러진 용병을 포함한 합류 인원에게 전량 지급. 레벨 상승 스탯은 다음 전투부터 적용하여 전투 중 레벨업이 HP를 회복시키지 않음.
- 방어 공식은 `max(1, round(ATK × 20 / (20 + DEF) × 치명타 배율))`. 같은 틱에서는 용병 공격을 먼저 처리하고 사망한 유닛의 반격은 취소. 적은 전사→궁수→마법사 순서로 살아 있는 선봉을 공격.
- 일반 웨이브는 적 2/3/3마리, 보스는 2/3/보스 1마리. 보스 체력/공격 배율 7/2.5. 최초 클리어 코인은 일반 10, 보스 30, 보스 반복 2. 처치 골드는 몬스터 종류와 무관한 기획서 공식을 사용.
- 전투 결과를 1.5초 표시한 뒤 HP를 회복하여 재시작. 제한시간 마지막 틱에 최종 적을 처치하면 성공. 실패는 같은 스테이지, 도전 성공은 다음 스테이지, 반복 성공은 같은 스테이지로 이동. 3-10 이후는 P1에서 같은 스테이지 유지.
- 저장 봉투 `{schemaVersion, savedAt, state}`에 RNG·쿨타임·HP·진행 상태까지 저장. 시간 메타데이터는 상태 바깥에 두어 저장/로드의 deep equality를 보장. `load()`는 시간 진행 없이 복원하고 `init()`에서만 재접속 경과 시간을 적용.
- P1 복귀는 최대 600틱(60초)만 같은 시뮬레이터로 실행하며 남는 시간은 버림. 중간 시각 이벤트와 저장을 억제하고 최종 상태만 한 번 표시/저장. 오프라인 보고서·효율 보상·장비 드롭/인벤토리/합성·실제 스킬·카오스·JSON 가져오기/내보내기는 미구현.
- 장비 잠재 데이터의 등급별 범위와 가중치는 rare/epic/unique/legendary 순서이며, 값은 비율(0.05 = 5%)로 저장. 장비 효과는 P1에 적용하지 않음. 별도 Cloud 전역은 P1 범위와 4개 네임스페이스 규칙에 따라 추가하지 않음.

### 검증

- `js/`의 각 파일에 `node --check` 실행: 통과. 모든 작성 파일 600줄 미만.
- `node test/run.js`: **17 PASS**, 종료 코드 0.
- 브라우저 연결 도구에 사용 가능한 브라우저가 없었음. 설치된 Chrome의 임시 headless 프로필로 검증을 시도했으나 현재 실행 환경에서 renderer `Target crashed`/GPU 프로세스 오류가 발생하여 실제 화면·콘솔 오류 0 검증은 완료하지 못함. 순수 로직 검증과 구분하여 기록.

## Art assets — 2026-09-07

- Generated all 28 PNGs listed in ASSET_SPEC.md using the built-in ChatGPT image_gen tool, with separate calls per asset and the required common style prefix. No HTTP API keys, package installations, or Blender were used.
- Added assets/merc (6), assets/mon (12), assets/bg (3), and assets/icon (7), plus assets/manifest.json and the standalone checkerboard review grid assets/contact_sheet.html.
- Attack poses were generated from their corresponding idle image references. Regenerated the slime to remove an unwanted outfit, the yeti to stand upright, and the peak background to expand its flat ground area.
- Transparency path: native generated alpha preserved for all 25 mercenary, monster, and icon files. No magenta removal was necessary. Preinstalled Pillow 12.1.0 normalized dimensions and padding; backgrounds are opaque RGB 1080x760. Icons are centered; sprite bottoms align at approximately 95% canvas height.
- Recorded final prompts in assets/prompts.json and source paths, processing methods, and sizes in assets/generation_log.jsonl. assets/prepare_asset.py provides the local normalization helper; assets/verify_assets.py checks files and writes assets/verification.json.
- Verification: 28/28 PNGs exist at the exact requested paths, match specified dimensions, exceed 10 KB, and pass alpha/opacity checks. Manifest keys and contact-sheet references are valid. JavaScript syntax checks passed. This art task did not change game code.
- Missing or ungenerated assets: none.

## 0.3.0 · P3 — 2026-09-07

- `js/game-expedition.js`: `Game.harvest()`, `toggleSkill()`, `levelSkill()`, `setDifficulty()`, `exportSave()`·`importSave()`. 원정 보고서 생성·미수확 저장·수확 트랜잭션, 직업별 스킬북, 스킬 배치/성장, 독립 카오스 진행도, v2→v3 마이그레이션과 P3 저장 검증을 추가했다.
- `js/data.js`·`js/battle.js`: 용병별 스킬 4개와 기본 슬롯 3개, 우선순위/쿨타임, 도발·방어·강타·재생·연사·확정 치명타·독·회피·파티 회복·광역기·부활·흡수막 구현. 피격 무적과 카오스 HP/ATK 배율, 스킬 발동 이벤트를 적용했다.
- `js/game.js`·`js/game-equipment.js`: 기존 공개 함수 유지. `catchUp()`의 60초 이상 복귀는 수확 전용 보고서로 전환하고 스테이지/난이도별 최근 5분 통계를 보존한다. 장비 수령 함수를 분리해 P2 포화 처리 그대로 재사용한다. `schemaVersion: 3`, v1→v2→v3 연쇄 변환, 비파괴 `validateSave()`, 선택적 JSON 인자를 받는 `load()`와 허용된 다섯 번째 전역 `Cloud` 스텁을 추가했다. Cloud의 세 메서드는 비동기로 `Error('v2')`를 던지며 통신하지 않는다.
- `js/ui-expedition.js`·기존 UI·`style.css`·`index.html`: 전체 화면 원정 보고서, 1초 골드 카운트업 후 200ms 간격 카드 뒤집기, 전체 공개/수확, 유니크 이상 강한 플래시, 스킬 카드/슬롯/책 소비, 전투 스킬 이름, 카오스 토글, JSON textarea·복사/선택 대체·검증 후 확인/적용, 호흡 애니메이션을 추가했다. 진동은 실제 사용자 입력 이후에만 호출한다.
- `test/p3.js`, `test/long-run.js`, `test/browser-p3.js` 추가. 기존 로직/브라우저 테스트와 독립 밸런스 스크립트의 로딩 순서를 갱신했다. P1 무스킬 기준 검증은 유지하고 P3로 변경된 버전·복귀·무적 기대값만 수정했다.

### DECISION: 원정·스킬·카오스·저장

- 60초 미만은 기존 결정적 전투 빨리감기, 그 이상은 최대 24시간 × 효율 70%. 처치 수는 소수 기대값으로 보관하고 골드/XP는 정수 내림하며 부동소수점 오차를 보정한다. 도전 중 나가도 마지막으로 실행한 스테이지를 반복 원정 대상으로 삼으며 오프라인 최초 클리어/해금/코인은 지급하지 않는다.
- 해당 스테이지의 실측 표본이 없으면 초당 0.1처치와 적 골드(카오스/장비 골드 보너스 포함)를 쓴다. 보스 스테이지는 전체 6마리 중 보스 1마리 비율로 확정 드롭과 XP 배수를 반영한다. 이미 측정된 골드 수익에는 장비 보너스를 중복 적용하지 않는다.
- 장비 추첨은 보고서당 최대 500회. 초과 처치는 각 추첨 확률에 대표 처치 수를 곱해 반영하되 확률 100%, 장비 500개가 상한이다. 스킬북은 인벤토리를 쓰지 않고 직업별 기대량을 확률 반올림한 최대 3개 묶음 카드로 보관한다. 온라인은 처치당 별도 3% 추첨으로 세 직업 중 하나를 균등 지급하고 즉시 저장한다.
- 미수확 보고서는 생성 결과와 RNG/UID를 함께 저장하며 재접속 시 재추첨하지 않는다. 수확 전에는 전투와 추가 원정 시간 누적을 멈춘다. 수확은 한 번만 가능하며 모든 보상을 적용한 뒤 저장하고 현재 스테이지 전투를 새로 시작한다. 장비함 포화 시 잠금/장착 보호·최저 티어 레어 판매·대체 환전은 P2 규칙 그대로다.
- 스킬 슬롯 순서가 우선순위이며 해제 후 다시 탭하면 마지막 슬롯에 들어간다. 용병은 틱당 준비된 스킬 하나를 쓰고, 없으면 공격 대기시간에 따라 기본 공격한다. 회복은 부상자가 있을 때, 부활은 쓰러진 동료가 있을 때만 사용한다. 장착 변경은 이미 흐른 쿨타임을 초기화하지 않는다.
- 스킬북 비용은 현재 스킬 레벨(1→2는 1권, 9→10은 9권), 최대 10레벨. 후반 진행 목표에 맞춰 효과 성장 배율은 `1 + 0.5 × (level - 1)`로 정했다. 도발은 지속시간, 부활은 쿨타임에 배율을 적용하며 부활 HP는 항상 30%, 전투당 한 번이다. 다른 피해/회복/방어/흡수 효과는 위력에 적용한다. P1 적 성장 곡선과 P2 장비 기본값/드롭 확률은 유지한다.
- `invincibleOnHit` 잠재가 하나라도 장착되어 있으면 피격마다 고정 2% 확률로 해당 타격부터 1초간 무적. 기존 잠재 수치의 저장/재설정 범위는 호환을 위해 보존하지만 중첩으로 발동 확률을 늘리지 않는다.
- 일반 3-10 실제 클리어 후 카오스 해금. 난이도별 진행도와 마지막 선택 스테이지를 분리한다. 카오스 HP는 일반 적의 반올림된 HP ×8, ATK ×5, 골드 ×4, 최초 클리어 코인 ×3이며 보스도 T5~8 카오스 표를 사용한다. 카오스 상점은 추가하지 않는다.
- v2의 혼합 스테이지 통계는 이관 시 비워 보수적인 원정 추정치를 사용한다. 기존 용병/장비/진행도/전투 HP와 공격 대기는 보존한다. JSON 가져오기는 전체 검증 후 확인을 받고 교체하며, 가져온 시각부터 저장한다. 가져오기 자체는 과거 시각으로 추가 보상을 생성하지 않지만 미수확 보고서는 그대로 복원한다.

### 검증

- 모든 `js/*.js`를 파일별 `node --check`로 확인(Windows glob 미확장 대응), `node test/run.js`: **37 PASS**, 종료 코드 0. 각 코드/테스트 파일 600줄 미만, 변경 코드의 `git diff --check` 통과.
- 로직: 70% 보고서 수식·60초 경계·24시간 상한·미수확 재접속/중복 수확 방지·스킬북 3% 경계/즉시 저장·12개 효과·쿨타임/우선순위·저장 후에도 전투당 한 번 부활·30개 카오스 스테이지 배율/해금·마이그레이션·JSON 왕복·손상된 효과/슬롯/보고서의 원자적 거부를 검증했다.
- 장기 진행: 10초마다 장비 평가/장착·자동 합성·스킬북 사용, 두 번 실패하면 세 스테이지 아래에서 10분 반복 후 재도전, 매시간 저장/로드. 무료 장비/XP 없이 시드 **271828 / 7919 / 42**가 각각 **5.50 / 5.10 / 5.72시간**에 일반 3-10 클리어(각 6개 세션, 합성 248 / 209 / 234회). 모두 6시간 제한 통과.
- Chrome 152: 기존 P1/P2 회귀와 P3 브라우저 검증 통과. savedAt을 3시간 전으로 저장한 재로딩에서 카운트업·200ms 뒤집기·강한 플래시·탭 공개·수확/포화 판매, 61초 숨김 후 visibilitychange 복귀, 전투 스킬 이름/슬롯 변경, 3-10 전후 카오스 토글, JSON 복사/잘못된 입력 거부/확인 후 왕복을 확인했다. 375px 가로 넘침 없음, 콘솔·런타임 오류 0. 실행은 기존 격리 headless 프로필에서 `BROWSER_NO_SANDBOX=1`, `BROWSER_FAST=1` 사용; P2 120초 전투는 1,200틱 재생, P3 연출은 실제 프레임으로 검증했다.
- 동시 작업의 `assets/` 파일에는 접근하지 않았다. 변경 이력은 직전 내용을 다시 읽어 단일 원자적 교체로 이 절을 덧붙였다.
