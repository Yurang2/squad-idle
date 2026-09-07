# 몬스터 종 목록 v1 — 3지역 × 6종 (1단계 형태)

원칙: 실제 동물 해부에 기반한 "도감 생물". 파스텔 새벽 톤(`STYLE.md`). 치비·마스코트 금지. 각 종은 역할(tank/dps/support)과 캠프 직업(campJob)을 가진다. 진화 2·3단계는 M4에서 추가.

## 지역 1 · 안개 호수 (lake) — 흰색·라벤더·복숭아
| id | 이름 | 모델 동물 | 역할 | campJob | 비고 |
|---|---|---|---|---|---|
| mistfox | 안개여우 | 여우 | dps | 채집 | 이미 확정 (`concepts/monsters/fox_wild.png`) |
| lakebat | 호수박쥐 | 박쥐 | support | 정찰 | 이미 확정 (`concepts/monsters/lakebat.png`) |
| dewslime | 이슬슬라임 | 물방울 | tank | 물긷기 | **재디자인**: 단단한 물방울 형태, 큰 눈 2개 명확, 안에 빛 한 점 |
| reedheron | 갈대왜가리 | 왜가리 | support | 낚시 | 긴 다리, 회색빛 라벤더 깃 |
| pondturtle | 이끼거북 | 거북 | tank | 돌 나르기 | 등껍질에 이끼와 작은 꽃 |
| glowmoth | 새벽나방 | 나방 | dps | 불 지피기 | 반투명 날개에 빛무늬 |

## 지역 2 · 서리 능선 (ridge) — 하늘색·은색·연보라
| id | 이름 | 모델 동물 | 역할 | campJob | 비고 |
|---|---|---|---|---|---|
| snowhare | 눈토끼 | 산토끼 | dps | 채집 | 긴 귀 끝만 연보라 |
| ridgegoat | 능선염소 | 산양 | tank | 돌 나르기 | 굽은 뿔, 두꺼운 털 |
| frostowl | 서리올빼미 | 올빼미 | support | 정찰 | 얼굴 원반이 눈꽃 무늬 |
| icewolf | 서리늑대 | 늑대 | dps | 사냥 | 은회색, 눈이 옅은 파랑 |
| crystalbeetle | 수정풍뎅이 | 풍뎅이 | tank | 광산 | 등딱지가 반투명 수정 |
| cloudram | 구름양 | 양 | support | 양털 | 구름 같은 털, 온화한 얼굴 |

## 지역 3 · 노을 절벽 (cliff) — 복숭아·주황·장미빛
| id | 이름 | 모델 동물 | 역할 | campJob | 비고 |
|---|---|---|---|---|---|
| emberlizard | 노을도마뱀 | 도마뱀 | dps | 불 지피기 | 등에 따뜻한 빛줄 |
| cliffhawk | 절벽매 | 매 | dps | 정찰 | 날개 끝이 장미빛 |
| sandpangolin | 모래천산갑 | 천산갑 | tank | 광산 | 비늘이 복숭아빛 |
| duskcat | 노을살쾡이 | 살쾡이 | dps | 사냥 | 귀 뒤 주황 무늬 |
| rockcrab | 바위게 | 게 | tank | 돌 나르기 | 집게에 작은 수정 |
| windserpent | 바람뱀 | 뱀 | support | 낚시 | 가늘고 길며 깃털 같은 갈기 |

## 보스 3종 (포획 불가, M4)
호수의 거대 왜가리 / 능선의 늙은 산양 왕 / 절벽의 노을 매 군주.

## 에셋 규격
- `assets/monsters/<id>.png`, 1024×1024 RGBA, **왼쪽을 바라봄**(적 방향), 전신, 하단 8% 여백, 그림자 없음.
- 아군으로 쓰일 때는 코드에서 좌우 반전. 좌우 비대칭 무늬는 피한다.
