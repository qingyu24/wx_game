export const WORLD = { width: 1440, height: 1000 };
export const camp = { x: 530, y: 700 };
export const caches = [
  { x: 290, y: 790 },
  { x: 1120, y: 580 },
  { x: 1010, y: 300 },
];
export const spawns = [
  { x: 780, y: 770 },
  { x: 970, y: 680 },
  { x: 1170, y: 400 },
  { x: 790, y: 350 },
  { x: 350, y: 380 },
];
export const nodePoint = (n) => {
  const x = n.x * 13 + 50,
    y = n.y * 9 + 30;
  return { x: x > 615 && x < 740 ? 760 : x, y };
};
export function blocked(x, y) {
  if (x < 45 || x > 1395 || y < 90 || y > 950) return true;
  // River has two walkable bridges.
  if (x > 630 && x < 726 && !(y > 680 && y < 764) && !(y > 270 && y < 346))
    return true;
  return false;
}
export function moveHero(p, dx, dy) {
  const x = blocked(p.x + dx, p.y) ? p.x : p.x + dx;
  return { x, y: blocked(x, p.y + dy) ? p.y : p.y + dy };
}
export function claimWildReward(state, id) {
  if (
    !/^[0-7]:(enemy[0-4]|chest[0-2])$/.test(id) ||
    Number(id[0]) !== state.chapter ||
    state.wilds?.includes(id)
  )
    return state;
  const chest = id.includes("chest");
  return {
    ...state,
    wilds: [...(state.wilds || []), id],
    coins: Math.min(1000000, state.coins + (chest ? 24 : 12)),
    xp: Math.min(100000, state.xp + (chest ? 10 : 18)),
    herbs: Math.min(9999, state.herbs + (chest ? 1 : 0)),
  };
}
export function hitEnemies(enemies, hero, facing, magic = false) {
  return enemies.map((e) => {
    const dx = e.x - hero.x,
      dy = e.y - hero.y,
      d = Math.hypot(dx, dy);
    const hit =
      e.hp > 0 &&
      d < (magic ? 170 : 94) &&
      (magic || d < 30 || (dx * facing.x + dy * facing.y) / d > 0.1);
    return hit
      ? { ...e, hp: Math.max(0, e.hp - (magic ? 65 : 34)), flash: 0.18 }
      : e;
  });
}

// Route clicks around the river so tapping the opposite bank finds a bridge.
export function findPath(start, goal) {
  if (blocked(goal.x, goal.y)) return [];
  const step = 20,
    cell = (p) => [Math.round(p.x / step), Math.round(p.y / step)];
  const a = cell(start),
    b = cell(goal),
    key = ([x, y]) => `${x},${y}`;
  const queue = [a],
    previous = new Map([[key(a), null]]);
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    if (key(p) === key(b)) {
      const path = [goal];
      let current = p;
      while (previous.get(key(current))) {
        path.push({ x: current[0] * step, y: current[1] * step });
        current = previous.get(key(current));
      }
      return path.reverse();
    }
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const next = [p[0] + dx, p[1] + dy],
        id = key(next);
      if (!previous.has(id) && !blocked(next[0] * step, next[1] * step)) {
        previous.set(id, p);
        queue.push(next);
      }
    }
  }
  return [];
}
