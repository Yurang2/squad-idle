# 에셋 스펙 — 치비 카툰 이미지

공통 스타일 키워드 (모든 프롬프트 앞에 붙임):
`chibi, big head small body, cute, thick dark-brown outlines, cel-shaded, bright saturated colors, glossy, casual mobile game style, full body, transparent background, no text, no watermark`

파일 위치 `assets/` 아래. PNG, 투명 배경. 이름은 아래 표 그대로 (코드가 이 이름을 참조).

## 1. 용병 (facing RIGHT, 512×512, 각 2장: idle / attack)

| 파일 | 프롬프트 요지 |
|---|---|
| `merc/warrior_idle.png`, `merc/warrior_attack.png` | 어린 기사, 주황·금색 갑옷, 큰 방패와 검. attack은 검을 휘두르는 순간 |
| `merc/archer_idle.png`, `merc/archer_attack.png` | 초록 후드 소녀 궁수, 나무 활. attack은 활시위 당김 |
| `merc/mage_idle.png`, `merc/mage_attack.png` | 보라 고깔모자 꼬마 마법사, 별 지팡이. attack은 지팡이 들고 빛 |

## 2. 몬스터 (facing LEFT, 512×512, 각 1장) — 지역별 팔레트

| 지역 | 파일 | 내용 |
|---|---|---|
| 1 잊힌 숲 (초록·갈색) | `mon/slime.png` | 연두 젤리 슬라임, 멍한 눈 |
| | `mon/goblin.png` | 초록 고블린, 나무 몽둥이 |
| | `mon/mushroom.png` | 빨간 점박이 버섯 괴물, 화난 눈썹 |
| | `mon/boss_treant.png` | 보스: 큰 나무 정령, 얼굴 있는 몸통 (640×640) |
| 2 얼어붙은 봉우리 (하늘·흰색) | `mon/ice_bat.png` | 얼음 박쥐, 파란 날개 |
| | `mon/yeti.png` | 작은 예티, 흰 털 |
| | `mon/frost_wolf.png` | 서리 늑대, 하늘색 |
| | `mon/boss_ice_golem.png` | 보스: 얼음 골렘, 크리스탈 몸 (640×640) |
| 3 잿빛 화산 (빨강·검정) | `mon/lava_slime.png` | 용암 슬라임, 주황 발광 |
| | `mon/imp.png` | 빨간 임프, 삼지창 |
| | `mon/salamander.png` | 불 도마뱀 |
| | `mon/boss_dragon.png` | 보스: 아기 드래곤, 빨강·금 (640×640) |

## 3. 배경 (1080×760, 불투명, 지평선을 높이 55% 위치에)

| 파일 | 내용 |
|---|---|
| `bg/forest.png` | 밝은 낮 숲 길, 파란 하늘, 큰 나무, 카툰 |
| `bg/peak.png` | 눈 덮인 산길, 맑은 하늘, 얼음 크리스탈 |
| `bg/volcano.png` | 화산 지대, 용암 강, 주황 하늘 (밝은 톤 유지) |

## 4. 아이콘 (256×256, 각 1장, 정면)

| 파일 | 내용 |
|---|---|
| `icon/weapon.png` | 검 |
| `icon/hat.png` | 투구/모자 |
| `icon/gloves.png` | 장갑 |
| `icon/shoes.png` | 부츠 |
| `icon/skillbook.png` | 반짝이는 마법책 |
| `icon/gold.png` | 금화 |
| `icon/coin.png` | 보라 보석 (스쿼드 코인) |
| `icon/merc.png` | 교차한 만화 검 두 자루와 작은 방패 |
| `icon/fusion.png` | 작은 보석 세 개가 빛나는 보석 하나로 합쳐지는 모습 |
| `icon/settings.png` | 광택 있는 주황 톱니바퀴 |

등급 색은 코드에서 테두리로 칠하므로 아이콘은 등급 무관 1종.

## 5. 코드 연동 규칙
- `DATA.assets` 매핑에 위 경로를 등록하고, 렌더 층은 `<image href>`(SVG) 또는 `<img>`로 사용. 파일이 없으면 기존 벡터 도형으로 폴백.
- 용병 attack 프레임은 공격 순간 120ms 표시 후 idle로 복귀. 피격은 CSS 필터로 흰색 플래시.
- 스프라이트 바닥 정렬: 이미지 하단 5%가 발판 그림자 위치.
