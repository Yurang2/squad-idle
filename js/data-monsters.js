"use strict";

// DECISION: Exact art paths inlined from assets/monsters/manifest.json; no runtime fetch.
Object.assign(DATA.species, {
  "mistfox": {
    "id": "mistfox", "name": "안개여우", "region": "lake", "role": "dps", "element": "wind",
    "baseStats": {"hp": 120, "atk": 14, "attackSpeed": 1.15, "critChance": 0.08, "critDamage": 1.5, "def": 4},
    "growth": 0.06, "catchRate": 0.88, "campJob": "채집", "art": "assets/monsters/mistfox.png",
    "skill": {"id": "mistfoxSkill", "name": "안개 도약", "cooldown": 7, "effect": {"type": "hit", "power": 1.8, "duration": 5}}
  },
  "lakebat": {
    "id": "lakebat", "name": "호수박쥐", "region": "lake", "role": "support", "element": "water",
    "baseStats": {"hp": 110, "atk": 10, "attackSpeed": 1, "critChance": 0.08, "critDamage": 1.5, "def": 4},
    "growth": 0.06, "catchRate": 0.86, "campJob": "정찰", "art": "assets/monsters/lakebat.png",
    "skill": {"id": "lakebatSkill", "name": "물결 노래", "cooldown": 9, "effect": {"type": "heal", "power": 0.16, "duration": 5}}
  },
  "dewslime": {
    "id": "dewslime", "name": "이슬슬라임", "region": "lake", "role": "tank", "element": "water",
    "baseStats": {"hp": 210, "atk": 10, "attackSpeed": 0.8, "critChance": 0.08, "critDamage": 1.5, "def": 14},
    "growth": 0.06, "catchRate": 0.92, "campJob": "물긷기", "art": "assets/monsters/dewslime.png",
    "skill": {"id": "dewslimeSkill", "name": "이슬 막", "cooldown": 9, "effect": {"type": "shield", "power": 0.25, "duration": 5}}
  },
  "reedheron": {
    "id": "reedheron", "name": "갈대왜가리", "region": "lake", "role": "support", "element": "wind",
    "baseStats": {"hp": 125, "atk": 12, "attackSpeed": 0.85, "critChance": 0.08, "critDamage": 1.5, "def": 5},
    "growth": 0.06, "catchRate": 0.8, "campJob": "낚시", "art": "assets/monsters/reedheron.png",
    "skill": {"id": "reedheronSkill", "name": "고요한 샘", "cooldown": 9, "effect": {"type": "heal", "power": 0.2, "duration": 5}}
  },
  "pondturtle": {
    "id": "pondturtle", "name": "이끼거북", "region": "lake", "role": "tank", "element": "earth",
    "baseStats": {"hp": 240, "atk": 9, "attackSpeed": 0.65, "critChance": 0.08, "critDamage": 1.5, "def": 18},
    "growth": 0.06, "catchRate": 0.86, "campJob": "돌 나르기", "art": "assets/monsters/pondturtle.png",
    "skill": {"id": "pondturtleSkill", "name": "이끼 껍질", "cooldown": 9, "effect": {"type": "shield", "power": 0.3, "duration": 5}}
  },
  "glowmoth": {
    "id": "glowmoth", "name": "새벽나방", "region": "lake", "role": "dps", "element": "light",
    "baseStats": {"hp": 105, "atk": 15, "attackSpeed": 1, "critChance": 0.08, "critDamage": 1.5, "def": 3},
    "growth": 0.06, "catchRate": 0.82, "campJob": "불 지피기", "art": "assets/monsters/glowmoth.png",
    "skill": {"id": "glowmothSkill", "name": "빛가루", "cooldown": 9, "effect": {"type": "dot", "power": 0.35, "duration": 5}}
  },
  "snowhare": {
    "id": "snowhare", "name": "눈토끼", "region": "ridge", "role": "dps", "element": "ice",
    "baseStats": {"hp": 125, "atk": 15, "attackSpeed": 1.25, "critChance": 0.08, "critDamage": 1.5, "def": 5},
    "growth": 0.06, "catchRate": 0.82, "campJob": "채집", "art": "assets/monsters/snowhare.png",
    "skill": {"id": "snowhareSkill", "name": "눈꽃 뜀", "cooldown": 7, "effect": {"type": "hit", "power": 1.8, "duration": 5}}
  },
  "ridgegoat": {
    "id": "ridgegoat", "name": "능선염소", "region": "ridge", "role": "tank", "element": "earth",
    "baseStats": {"hp": 235, "atk": 12, "attackSpeed": 0.8, "critChance": 0.08, "critDamage": 1.5, "def": 16},
    "growth": 0.06, "catchRate": 0.76, "campJob": "돌 나르기", "art": "assets/monsters/ridgegoat.png",
    "skill": {"id": "ridgegoatSkill", "name": "능선의 의지", "cooldown": 9, "effect": {"type": "shield", "power": 0.28, "duration": 5}}
  },
  "frostowl": {
    "id": "frostowl", "name": "서리올빼미", "region": "ridge", "role": "support", "element": "ice",
    "baseStats": {"hp": 135, "atk": 12, "attackSpeed": 0.9, "critChance": 0.08, "critDamage": 1.5, "def": 6},
    "growth": 0.06, "catchRate": 0.78, "campJob": "정찰", "art": "assets/monsters/frostowl.png",
    "skill": {"id": "frostowlSkill", "name": "서리 숨결", "cooldown": 9, "effect": {"type": "heal", "power": 0.2, "duration": 5}}
  },
  "icewolf": {
    "id": "icewolf", "name": "서리늑대", "region": "ridge", "role": "dps", "element": "ice",
    "baseStats": {"hp": 150, "atk": 17, "attackSpeed": 1.1, "critChance": 0.08, "critDamage": 1.5, "def": 6},
    "growth": 0.06, "catchRate": 0.74, "campJob": "사냥", "art": "assets/monsters/icewolf.png",
    "skill": {"id": "icewolfSkill", "name": "얼음 송곳니", "cooldown": 7, "effect": {"type": "hit", "power": 2, "duration": 5}}
  },
  "crystalbeetle": {
    "id": "crystalbeetle", "name": "수정풍뎅이", "region": "ridge", "role": "tank", "element": "earth",
    "baseStats": {"hp": 220, "atk": 11, "attackSpeed": 0.75, "critChance": 0.08, "critDamage": 1.5, "def": 20},
    "growth": 0.06, "catchRate": 0.8, "campJob": "광산", "art": "assets/monsters/crystalbeetle.png",
    "skill": {"id": "crystalbeetleSkill", "name": "수정 장막", "cooldown": 9, "effect": {"type": "shield", "power": 0.32, "duration": 5}}
  },
  "cloudram": {
    "id": "cloudram", "name": "구름양", "region": "ridge", "role": "support", "element": "wind",
    "baseStats": {"hp": 155, "atk": 10, "attackSpeed": 0.85, "critChance": 0.08, "critDamage": 1.5, "def": 8},
    "growth": 0.06, "catchRate": 0.84, "campJob": "양털", "art": "assets/monsters/cloudram.png",
    "skill": {"id": "cloudramSkill", "name": "구름의 품", "cooldown": 9, "effect": {"type": "heal", "power": 0.23, "duration": 5}}
  },
  "emberlizard": {
    "id": "emberlizard", "name": "노을도마뱀", "region": "cliff", "role": "dps", "element": "fire",
    "baseStats": {"hp": 145, "atk": 18, "attackSpeed": 1, "critChance": 0.08, "critDamage": 1.5, "def": 6},
    "growth": 0.06, "catchRate": 0.78, "campJob": "불 지피기", "art": "assets/monsters/emberlizard.png",
    "skill": {"id": "emberlizardSkill", "name": "잔불 자국", "cooldown": 9, "effect": {"type": "dot", "power": 0.4, "duration": 5}}
  },
  "cliffhawk": {
    "id": "cliffhawk", "name": "절벽매", "region": "cliff", "role": "dps", "element": "wind",
    "baseStats": {"hp": 140, "atk": 19, "attackSpeed": 1.2, "critChance": 0.08, "critDamage": 1.5, "def": 5},
    "growth": 0.06, "catchRate": 0.7, "campJob": "정찰", "art": "assets/monsters/cliffhawk.png",
    "skill": {"id": "cliffhawkSkill", "name": "노을 급강하", "cooldown": 7, "effect": {"type": "hit", "power": 2, "duration": 5}}
  },
  "sandpangolin": {
    "id": "sandpangolin", "name": "모래천산갑", "region": "cliff", "role": "tank", "element": "earth",
    "baseStats": {"hp": 255, "atk": 12, "attackSpeed": 0.75, "critChance": 0.08, "critDamage": 1.5, "def": 20},
    "growth": 0.06, "catchRate": 0.78, "campJob": "광산", "art": "assets/monsters/sandpangolin.png",
    "skill": {"id": "sandpangolinSkill", "name": "모래 비늘", "cooldown": 9, "effect": {"type": "shield", "power": 0.3, "duration": 5}}
  },
  "duskcat": {
    "id": "duskcat", "name": "노을살쾡이", "region": "cliff", "role": "dps", "element": "fire",
    "baseStats": {"hp": 150, "atk": 18, "attackSpeed": 1.3, "critChance": 0.08, "critDamage": 1.5, "def": 6},
    "growth": 0.06, "catchRate": 0.72, "campJob": "사냥", "art": "assets/monsters/duskcat.png",
    "skill": {"id": "duskcatSkill", "name": "황혼 발톱", "cooldown": 7, "effect": {"type": "hit", "power": 1.9, "duration": 5}}
  },
  "rockcrab": {
    "id": "rockcrab", "name": "바위게", "region": "cliff", "role": "tank", "element": "earth",
    "baseStats": {"hp": 245, "atk": 13, "attackSpeed": 0.7, "critChance": 0.08, "critDamage": 1.5, "def": 22},
    "growth": 0.06, "catchRate": 0.82, "campJob": "돌 나르기", "art": "assets/monsters/rockcrab.png",
    "skill": {"id": "rockcrabSkill", "name": "바위 집게", "cooldown": 9, "effect": {"type": "shield", "power": 0.32, "duration": 5}}
  },
  "windserpent": {
    "id": "windserpent", "name": "바람뱀", "region": "cliff", "role": "support", "element": "wind",
    "baseStats": {"hp": 160, "atk": 13, "attackSpeed": 1, "critChance": 0.08, "critDamage": 1.5, "def": 7},
    "growth": 0.06, "catchRate": 0.76, "campJob": "낚시", "art": "assets/monsters/windserpent.png",
    "skill": {"id": "windserpentSkill", "name": "바람의 위로", "cooldown": 9, "effect": {"type": "heal", "power": 0.24, "duration": 5}}
  }
});
