import { chapters, endings, VERSION } from "./content.mjs";
import { routeDefinition, validateExpedition } from "./expeditions.mjs";
export const SAVE_KEY = "mist-lantern-save-v1";
export const BACKUP_KEY = "mist-lantern-backup-v1";
export const freshState = () => ({
  version: VERSION,
  chapter: 0,
  unlocked: 0,
  completed: [],
  choices: {},
  memories: [],
  journal: [],
  xp: 0,
  coins: 35,
  herbs: 5,
  oil: 3,
  gear: { blade: 1, lantern: 1, coat: 1 },
  hp: 110,
  mp: 6,
  seconds: 0,
  routes: [],
  wilds: [],
  expedition: null,
  ending: null,
  started: false,
  position: { x: 37, y: 70 },
});
export const keyFor = (chapter, id) => `${chapter}:${id}`;
export const level = (s) => Math.min(20, 1 + Math.floor(s.xp / 110));
export const stats = (s) => ({
  maxHp: 94 + level(s) * 16 + s.gear.coat * 8,
  attack: 13 + level(s) * 3 + s.gear.blade * 4,
  magic: 19 + level(s) * 3 + s.gear.lantern * 6,
  armor: 2 + s.gear.coat * 2,
  maxMp: 6,
});
export const autonomy = (s) =>
  Object.values(s.choices).filter((v) => v === 1).length;
export const done = (s, ch, id) => s.completed.includes(keyFor(ch, id));
export const requirements = (s, ch, n) =>
  (n.requires || []).filter((id) => !done(s, ch, id));
export const canEnter = (s, ch, n) =>
  ch >= 0 && ch <= s.unlocked && requirements(s, ch, n).length === 0;
const reward = (s, r = {}) => {
  for (const k of ["xp", "coins", "herbs", "oil"]) s[k] += r[k] || 0;
};
export function resolveNode(state, ch, id, choice = null) {
  const s = structuredClone(state),
    n = chapters[ch]?.nodes.find((n) => n.id === id);
  if (!n || !canEnter(s, ch, n) || done(s, ch, id)) return state;
  if (n.kind === "choice" && choice !== 0 && choice !== 1) return state;
  if (n.kind === "choice") {
    s.choices[keyFor(ch, id)] = n.choices[choice].value;
    reward(s, n.choices[choice].reward);
  }
  const oldLevel = level(s);
  s.completed.push(keyFor(ch, id));
  reward(s, n.reward);
  if (n.clue)
    s.journal.push({ key: keyFor(ch, id), chapter: ch, text: n.clue });
  if (n.memory)
    s.memories.push({
      key: keyFor(ch, id),
      name: n.memory,
      text: n.codex,
      chapter: ch,
    });
  if (n.kind === "boss") {
    reward(s, { xp: 75 + ch * 25, coins: 50 + ch * 15, oil: 2, herbs: 2 });
    s.unlocked = Math.max(s.unlocked, Math.min(chapters.length - 1, ch + 1));
  }
  if (level(s) > oldLevel || n.kind === "boss") {
    s.hp = stats(s).maxHp;
    s.mp = 6;
  }
  return s;
}
export function rest(state) {
  const s = structuredClone(state);
  s.hp = stats(s).maxHp;
  s.mp = 6;
  return s;
}
export function upgrade(state, kind) {
  if (!["blade", "lantern", "coat"].includes(kind)) return state;
  const cost = upgradeCost(state, kind);
  if (state.coins < cost || state.gear[kind] >= 5) return state;
  const s = structuredClone(state);
  s.coins -= cost;
  s.gear[kind]++;
  s.hp = Math.min(stats(s).maxHp, s.hp + (kind === "coat" ? 8 : 0));
  return s;
}
export const upgradeCost = (s, kind) => 30 + s.gear[kind] * 30;
export function buy(state, kind) {
  const prices = { herbs: 12, oil: 18 };
  if (!(kind in prices) || state.coins < prices[kind]) return state;
  const s = structuredClone(state);
  s.coins -= prices[kind];
  s[kind]++;
  return s;
}
export const eligibleDawn = (s) => s.memories.length >= 4 && autonomy(s) >= 4;
export function chooseEnding(state, id) {
  if (
    !endings[id] ||
    !done(state, 7, "boss") ||
    (id === "dawn" && !eligibleDawn(state))
  )
    return state;
  return { ...state, ending: id };
}
export function createBattle(state, ch, nodeId) {
  const n = chapters[ch]?.nodes.find((n) => n.id === nodeId);
  if (
    !n ||
    !["battle", "boss"].includes(n.kind) ||
    done(state, ch, nodeId) ||
    !canEnter(state, ch, n)
  )
    return null;
  const enemy = structuredClone(
    n.kind === "boss" ? chapters[ch].boss : n.enemy,
  );
  enemy.boss = n.kind === "boss";
  if (enemy.boss) enemy.hp = Math.round(enemy.hp * 2.25);
  return {
    chapter: ch,
    nodeId,
    enemy,
    enemyHp: enemy.hp,
    heroHp: state.hp,
    mp: state.mp,
    round: 0,
    poise: 3,
    resonance: 0,
    status: "active",
    heat: 0,
    thread: 0,
    lastAction: null,
    sealed: false,
    phase2: false,
    lastDamage: 0,
    log: [`${enemy.name}挡在前方。观察它的意图，再作行动。`],
  };
}
export const intent = (b) => b.enemy.pattern[b.round % b.enemy.pattern.length];
export const bossMechanics = [
  "食忆鳞粉：普通攻击会吸取 1 灵力。",
  "潮汐：守势时回复少量生命，破雾可穿透。",
  "悬丝：连续普通攻击会积累丝缚；灯术可清除。",
  "炉压：进攻积热，防御泄压；高热重击更危险。",
  "雨幕：守势回合减伤更强，破绽时伤害更高。",
  "回声：连续重复同一行动会招来额外伤害。",
  "旧誓：蓄力后会封住灯术一回合，短刃仍可行动。",
  "长夜：半血后进入第二阶段，听完证词可削弱重击。",
];
export const intentLabel = {
  strike: "即将攻击",
  charge: "正在蓄力",
  heavy: "重击将至",
  guard: "架起守势",
  expose: "破绽暴露",
};
export function battleAction(state, battle, action) {
  if (!battle || battle.status !== "active") return { state, battle };
  if (
    !["attack", "spell", "guard", "heal", "oil", "burst", "ally"].includes(
      action,
    )
  )
    return { state, battle };
  if (
    (action === "spell" && (battle.mp < 3 || battle.sealed)) ||
    (action === "heal" && state.herbs < 1) ||
    (action === "oil" && state.oil < 1) ||
    (action === "burst" && battle.resonance < 3) ||
    (action === "ally" && (battle.round % 4 !== 0 || battle.chapter < 1))
  )
    return { state, battle };
  const s = structuredClone(state),
    b = structuredClone(battle),
    st = stats(s),
    mode = intent(b),
    log = [];
  let damage = 0,
    guard = false,
    stagger = false;
  if (
    b.enemy.boss &&
    b.chapter === 7 &&
    b.enemyHp <= b.enemy.hp / 2 &&
    !b.phase2
  ) {
    b.phase2 = true;
    b.enemy.weak = "刃";
    log.push("长夜翻涌，第二阶段：弱点转为短刃。");
  }
  if (b.enemy.boss && b.chapter === 2) {
    if (action === "attack") b.thread = (b.thread || 0) + 1;
    if (action === "spell" || action === "burst") {
      b.thread = 0;
      log.push("灯火烧断了悬丝。");
    }
  }
  if (b.enemy.boss && b.chapter === 3) {
    if (["attack", "spell", "burst"].includes(action))
      b.heat = Math.min(4, (b.heat || 0) + 1);
    if (action === "guard") {
      b.heat = 0;
      log.push("你借凝神引开炉压，热量归零。");
    }
  }
  const repeated = b.enemy.boss && b.chapter === 5 && b.lastAction === action;
  b.sealed = false;
  if (action === "attack") {
    damage = st.attack;
    b.mp = Math.min(6, b.mp + 2);
    log.push("短刃划过雾气，恢复 2 点灵力。");
  }
  if (action === "spell") {
    damage = Math.round(st.magic * (b.enemy.weak === "灯" ? 1.35 : 1));
    b.mp -= 3;
    b.poise--;
    b.resonance = Math.min(3, b.resonance + 1);
    log.push("灯焰击中敌人，削去 1 点韧性。");
  }
  if (action === "guard") {
    guard = true;
    b.mp = Math.min(6, b.mp + 1);
    b.resonance = Math.min(3, b.resonance + 1);
    log.push("收灯凝神，伤害降低 75%，恢复 1 灵力，共鸣 +1。");
  }
  if (action === "heal") {
    s.herbs--;
    const before = b.heroHp;
    b.heroHp = Math.min(st.maxHp, b.heroHp + Math.round(st.maxHp * 0.5));
    log.push(`服用回春散，恢复 ${b.heroHp - before} 生命。`);
  }
  if (action === "oil") {
    s.oil--;
    b.mp = 6;
    b.resonance = 3;
    log.push("添入灯油，灵力与共鸣充满。");
  }
  if (action === "burst") {
    damage = Math.round(st.magic * 2.25);
    b.resonance = 0;
    b.poise -= 2;
    log.push("破雾共鸣！灯光穿过长夜。");
  }
  if (action === "ally") {
    if (b.chapter < 2) {
      const heal = Math.round(st.maxHp * 0.28);
      b.heroHp = Math.min(st.maxHp, b.heroHp + heal);
      guard = true;
      log.push(`闻笙·归航：恢复 ${heal} 生命，并为你挡住下一击。`);
    } else {
      damage = st.attack + 10;
      b.poise--;
      log.push("阿绫·断丝：造成伤害，削去 1 点韧性。");
    }
  }
  if (action === "attack" && b.enemy.weak === "刃")
    damage = Math.round(damage * 1.3);
  if (mode === "guard" && action !== "burst")
    damage = Math.round(
      damage * (b.enemy.boss && b.chapter === 4 ? 0.25 : 0.45),
    );
  if (mode === "expose")
    damage = Math.round(
      damage * (b.enemy.boss && b.chapter === 4 ? 1.9 : 1.65),
    );
  if (damage > 0) {
    b.enemyHp = Math.max(0, b.enemyHp - damage);
    log.push(
      `造成 ${damage} 伤害${mode === "guard" ? "（守势减伤）" : mode === "expose" ? "（击中破绽）" : ""}。`,
    );
  }
  if (b.poise <= 0) {
    stagger = true;
    b.poise = 3;
    log.push("敌方失衡，本回合行动被打断！");
  }
  b.lastDamage = damage;
  if (b.enemyHp <= 0) {
    b.status = "won";
    s.hp = b.heroHp;
    s.mp = b.mp;
    let resolved;
    if (b.expedition) {
      resolved = s;
      const token = b.expedition.feature;
      if (s.expedition && !s.expedition.collected.includes(token)) {
        s.expedition.collected.push(token);
        reward(s, { xp: 30 + b.chapter * 10, coins: 15 + b.chapter * 5 });
      }
    } else resolved = resolveNode(s, b.chapter, b.nodeId);
    log.push("雾散了。你守住了这盏灯。");
    b.log = [...b.log, ...log].slice(-30);
    return { state: resolved, battle: b };
  }
  if (!stagger) {
    if (mode === "charge") {
      log.push(`${b.enemy.name}正在蓄力。下一回合重击，防御或削韧可应对。`);
      if (b.enemy.boss && b.chapter === 6) {
        b.sealed = true;
        log.push("旧誓封灯：下一回合无法使用引灯术，可防御或短刃行动。");
      }
    } else if (mode === "guard") {
      log.push(`${b.enemy.name}护住要害。`);
      if (b.enemy.boss && b.chapter === 1) {
        const heal = 12;
        b.enemyHp = Math.min(b.enemy.hp, b.enemyHp + heal);
        log.push(`潮汐回流，敌人恢复 ${heal} 生命。`);
      }
    } else if (mode === "expose")
      log.push(`${b.enemy.name}动作迟缓，破绽仍在。`);
    else {
      let multiplier = mode === "heavy" ? 2 : 1;
      if (b.enemy.boss && b.chapter === 3 && mode === "heavy")
        multiplier += (b.heat || 0) * 0.25;
      if (b.enemy.boss && b.chapter === 7 && b.phase2)
        multiplier += Math.max(0, 0.5 - s.memories.length * 0.05);
      const hit = Math.max(
        1,
        Math.round(
          (b.enemy.attack * multiplier - st.armor) * (guard ? 0.25 : 1),
        ),
      );
      if (b.enemy.boss && b.chapter === 0 && mode === "strike") {
        b.mp = Math.max(0, b.mp - 1);
        log.push("食忆鳞粉吸取 1 灵力。");
      }
      b.heroHp = Math.max(0, b.heroHp - hit);
      log.push(
        `${mode === "heavy" ? "蓄力重击" : "敌方攻击"}造成 ${hit} 伤害${guard ? "，已格挡" : ""}。`,
      );
    }
  }
  if (b.enemy.boss && b.chapter === 2 && b.thread >= 2) {
    const hit = Math.round(b.enemy.attack * 0.6);
    b.heroHp = Math.max(0, b.heroHp - hit);
    log.push(`悬丝收紧，额外受到 ${hit} 伤害。引灯术可以清除。`);
  }
  if (repeated) {
    const hit = Math.round(b.enemy.attack * 0.5);
    b.heroHp = Math.max(0, b.heroHp - hit);
    log.push(`重复的回声反噬，受到 ${hit} 伤害。尝试不同的行动。`);
  }
  b.lastAction = action;
  b.round++;
  if (b.heroHp <= 0) {
    b.status = "lost";
    log.push("灯暂时熄灭。回营地歇息后可再次挑战，剧情与旧物保留。");
  }
  s.hp = b.heroHp;
  s.mp = b.mp;
  b.log = [...b.log, ...log].slice(-30);
  return { state: s, battle: b };
}
export function validateSave(input) {
  const error = () => {
    throw new Error("存档格式不正确或版本不兼容，当前进度未被覆盖。");
  };
  if (!input || typeof input !== "object" || input.version !== VERSION) error();
  const s = freshState();
  const bounded = (k, min, max) => {
    const v = input[k];
    if (!Number.isFinite(v) || !Number.isInteger(v) || v < min || v > max)
      error();
    s[k] = v;
  };
  for (const [k, a, b] of [
    ["chapter", 0, 7],
    ["unlocked", 0, 7],
    ["xp", 0, 100000],
    ["coins", 0, 1000000],
    ["herbs", 0, 9999],
    ["oil", 0, 9999],
    ["hp", 0, 1000],
    ["mp", 0, 6],
    ["seconds", 0, 100000000],
  ])
    bounded(k, a, b);
  if (s.chapter > s.unlocked) error();
  if (
    !Array.isArray(input.completed) ||
    input.completed.length >
      chapters.reduce((sum, c) => sum + c.nodes.length, 0) ||
    new Set(input.completed).size !== input.completed.length
  )
    error();
  const keys = new Set(
    chapters.flatMap((c) => c.nodes.map((n) => keyFor(c.id, n.id))),
  );
  if (
    input.completed.some(
      (k) =>
        typeof k !== "string" ||
        !keys.has(k) ||
        Number(k.split(":")[0]) > s.unlocked,
    )
  )
    error();
  s.completed = [...input.completed];
  if (
    !Array.isArray(input.routes) ||
    new Set(input.routes).size !== input.routes.length ||
    input.routes.length > 24 ||
    input.routes.some(
      (id) =>
        typeof id !== "string" ||
        !/^([0-7])\.([0-2])$/.test(id) ||
        Number(id[0]) > s.unlocked,
    )
  )
    error();
  s.routes = [...input.routes];
  for (const id of s.routes) {
    const [ch, floor] = id.split(".").map(Number);
    for (let i = 0; i < floor; i++)
      if (!s.routes.includes(`${ch}.${i}`)) error();
  }
  try {
    s.expedition = validateExpedition(input.expedition, s.routes, s.unlocked);
  } catch {
    error();
  }
  if (
    !input.gear ||
    Object.keys(s.gear).some(
      (k) =>
        !Number.isInteger(input.gear[k]) ||
        input.gear[k] < 1 ||
        input.gear[k] > 5,
    )
  )
    error();
  for (const k of Object.keys(s.gear)) s.gear[k] = input.gear[k];
  if (s.hp > stats(s).maxHp) error();
  for (let ch = 0; ch < s.unlocked; ch++) if (!done(s, ch, "boss")) error();
  if (
    !input.choices ||
    typeof input.choices !== "object" ||
    Array.isArray(input.choices)
  )
    error();
  s.choices = {};
  s.journal = [];
  s.memories = [];
  // Rebuild narrative data from trusted content, never render arbitrary save strings.
  for (const ch of chapters)
    for (const n of ch.nodes) {
      if (!done(s, ch.id, n.id)) continue;
      if (requirements(s, ch.id, n).length) error();
      if (
        n.kind === "dungeon" &&
        [0, 1, 2].some((i) => !s.routes.includes(`${ch.id}.${i}`))
      )
        error();
      if (n.kind === "choice") {
        const v = input.choices[keyFor(ch.id, n.id)];
        if (v !== 0 && v !== 1) error();
        s.choices[keyFor(ch.id, n.id)] = v;
      }
      if (n.clue)
        s.journal.push({
          key: keyFor(ch.id, n.id),
          chapter: ch.id,
          text: n.clue,
        });
      if (n.memory)
        s.memories.push({
          key: keyFor(ch.id, n.id),
          name: n.memory,
          text: n.codex,
          chapter: ch.id,
        });
    }
  if (
    input.ending !== null &&
    !["dawn", "keeper", "road"].includes(input.ending)
  )
    error();
  s.ending = input.ending;
  if (
    s.ending &&
    (!done(s, 7, "boss") || (s.ending === "dawn" && !eligibleDawn(s)))
  )
    error();
  if (
    input.wilds !== undefined &&
    (!Array.isArray(input.wilds) ||
      input.wilds.length > 64 ||
      new Set(input.wilds).size !== input.wilds.length ||
      input.wilds.some(
        (id) =>
          typeof id !== "string" ||
          !/^[0-7]:(enemy[0-4]|chest[0-2])$/.test(id) ||
          Number(id[0]) > s.unlocked,
      ))
  )
    error();
  s.wilds = [...(input.wilds || [])];
  s.started = Boolean(input.started);
  const p = input.position;
  s.position =
    p && Number.isFinite(p.x) && Number.isFinite(p.y)
      ? {
          x: Math.max(5, Math.min(95, p.x)),
          y: Math.max(28, Math.min(90, p.y)),
        }
      : { x: 37, y: 70 };
  return s;
}
export function readSave(storage) {
  for (const key of [SAVE_KEY, BACKUP_KEY]) {
    try {
      const text = storage.getItem(key);
      if (text) return validateSave(JSON.parse(text));
    } catch {}
  }
  return null;
}
export function writeSave(storage, state) {
  const s = validateSave(state),
    old = storage.getItem(SAVE_KEY);
  if (old) {
    try {
      validateSave(JSON.parse(old));
      storage.setItem(BACKUP_KEY, old);
    } catch {}
  }
  storage.setItem(SAVE_KEY, JSON.stringify(s));
}
export const playtime = (seconds) =>
  `${Math.floor(seconds / 3600)
    .toString()
    .padStart(
      2,
      "0",
    )}:${Math.floor(seconds / 60) % 60 < 10 ? "0" : ""}${Math.floor(seconds / 60) % 60}`;

export function createExpeditionBattle(state, event) {
  if (
    !state.expedition ||
    state.expedition.chapter !== event.chapter ||
    state.expedition.floor !== event.floor ||
    state.expedition.collected.includes(event.feature)
  )
    return null;
  const ch = event.chapter,
    floor = event.floor;
  const themes = [
    ["溪径灰蛾", "竹影迷蛾", "水闸食忆蛾"],
    ["沉船巡渡", "芦汊雾卫", "归航铃影"],
    ["戏服纸兵", "镜面替身", "弃景武生"],
    ["矿道铁卫", "地火傀机", "避难室旧械"],
    ["暗渠雨影", "学堂执伞人", "旧城守门影"],
    ["覆雪信差", "石窟霜卫", "无名峰回声"],
    ["记忆库灯影", "旧居誓卫", "空匣守望者"],
    ["晨光雾蛾", "归人幻影", "天台长夜影"],
  ];
  const enemy = {
    name: themes[ch][floor] + (event.feature === "battle1" ? "·深处" : ""),
    hp: Math.round((95 + ch * 52 + floor * 25) * 1.8),
    attack: 12 + ch * 4 + floor * 2,
    weak: ch % 2 === 0 ? "灯" : "刃",
    pattern:
      floor === 0
        ? ["strike", "charge", "heavy", "expose"]
        : floor === 1
          ? ["guard", "strike", "charge", "heavy", "expose"]
          : ["strike", "strike", "guard", "charge", "heavy", "expose"],
    lore: "回廊中的守卫只会出现一次。看清意图，合理使用沿途补给。",
  };
  return {
    chapter: ch,
    nodeId: "dungeon",
    expedition: { feature: event.feature, floor },
    enemy,
    enemyHp: enemy.hp,
    heroHp: state.hp,
    mp: state.mp,
    round: 0,
    poise: 3,
    resonance: 0,
    status: "active",
    heat: 0,
    thread: 0,
    lastAction: null,
    sealed: false,
    phase2: false,
    lastDamage: 0,
    log: [`${enemy.name}挡在回廊前方。`],
  };
}
