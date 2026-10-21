import {
  intent,
  battleAction,
  stats,
  buy,
  upgrade,
  upgradeCost,
  rest,
  createExpeditionBattle,
} from "../src/rpg/engine.mjs";
import {
  routeDefinition,
  moveExpedition,
  enterExpedition,
} from "../src/rpg/expeditions.mjs";
export function prepare(s) {
  s = rest(s);
  for (const kind of ["lantern", "blade", "coat"])
    if (s.coins >= upgradeCost(s, kind)) s = upgrade(s, kind);
  while (s.herbs < 3 && s.coins >= 12) s = buy(s, "herbs");
  return s;
}
export function winBattle(state, battle) {
  let s = state,
    b = battle;
  const trace = [];
  for (let turn = 0; turn < 150 && b.status === "active"; turn++) {
    const mode = intent(b);
    let action;
    if (mode === "heavy") action = "guard";
    else if (b.heroHp < stats(s).maxHp * 0.45 && s.herbs > 0) action = "heal";
    else if (b.resonance === 3 && mode !== "guard") action = "burst";
    else if (mode === "guard") action = "guard";
    else if (b.mp >= 3 && !b.sealed) action = "spell";
    else action = "attack";
    const result = battleAction(s, b, action);
    s = result.state;
    b = result.battle;
    trace.push(action);
  }
  if (b.status !== "won")
    throw Error(
      `${b.enemy.name} not won (HP ${b.heroHp}/${stats(s).maxHp}, enemy ${b.enemyHp}, rounds ${b.round}): ${trace.join(",")}`,
    );
  return { state: s, battle: b, trace };
}
export function solveRoute(ex) {
  const d = routeDefinition(ex.chapter, ex.floor),
    target = d.target.reduce((m, v, i) => m | (v << i), 0),
    start = {
      x: ex.x,
      y: ex.y,
      mask: ex.runes.reduce((m, v, i) => m | (v << i), 0),
      key: ex.collected.includes("key") ? 1 : 0,
      path: [],
    };
  const q = [start],
    seen = new Set([`${start.x},${start.y},${start.mask},${start.key}`]);
  for (let i = 0; i < q.length; i++) {
    const p = q[i];
    for (const [dx, dy] of [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
    ]) {
      const x = p.x + dx,
        y = p.y + dy;
      if (d.rows[y]?.[x] !== ".") continue;
      const f = d.tiles[`${x},${y}`];
      let mask = p.mask,
        key = p.key;
      if (f?.startsWith("rune")) {
        const n = Number(f.at(-1));
        mask ^= (1 << n) | (1 << (n + 1) % 3);
      }
      if (f === "key") key = 1;
      const path = [...p.path, [dx, dy]];
      if (f === "exit" && key && mask === target) return path;
      const k = `${x},${y},${mask},${key}`;
      if (!seen.has(k)) {
        seen.add(k);
        q.push({ x, y, mask, key, path });
      }
    }
  }
  throw Error(`Route ${d.id} has no solution`);
}
export function playRoute(state, ch, floor) {
  let s = enterExpedition({ ...state, expedition: null }, ch);
  const path = solveRoute(s.expedition);
  let fights = 0;
  for (const [dx, dy] of path) {
    const r = moveExpedition(s, dx, dy);
    s = r.state;
    if (r.event?.type === "battle") {
      s = prepare(s);
      s = winBattle(s, createExpeditionBattle(s, r.event)).state;
      fights++;
    }
  }
  return { state: s, steps: path.length, fights };
}
