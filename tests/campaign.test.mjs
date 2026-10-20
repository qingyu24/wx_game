import test from "node:test";
import assert from "node:assert/strict";
import { chapters, endings } from "../src/rpg/content.mjs";
import {
  freshState,
  resolveNode,
  createBattle,
  done,
  chooseEnding,
  validateSave,
  stats,
  readSave,
  writeSave,
  SAVE_KEY,
  BACKUP_KEY,
  requirements,
  battleAction,
  rest,
  buy,
  upgrade,
} from "../src/rpg/engine.mjs";
import {
  routeDefinition,
  newExpedition,
  moveExpedition,
  enterExpedition,
} from "../src/rpg/expeditions.mjs";
import { prepare, winBattle, playRoute, solveRoute } from "./helpers.mjs";
function campaign(choice = 0, side = true) {
  let s = { ...freshState(), started: true };
  const metrics = { fights: 0, rounds: 0, steps: 0 };
  for (const ch of chapters) {
    s = { ...s, chapter: ch.id };
    for (const n of ch.nodes) {
      if (n.kind === "side" && !side) continue;
      if (n.kind === "dungeon") {
        for (let floor = 0; floor < 3; floor++) {
          const result = playRoute(s, ch.id, floor);
          s = result.state;
          metrics.steps += result.steps;
          metrics.fights += result.fights;
        }
        s = resolveNode(s, ch.id, n.id);
      } else if (["battle", "boss"].includes(n.kind)) {
        s = prepare(s);
        const b = createBattle(s, ch.id, n.id);
        assert.ok(b, `${ch.id}:${n.id} must be reachable`);
        const result = winBattle(s, b);
        s = result.state;
        metrics.rounds += result.battle.round;
        metrics.fights++;
      } else
        s = resolveNode(s, ch.id, n.id, n.kind === "choice" ? choice : null);
      assert.doesNotThrow(() => validateSave(s), `save after ${ch.id}:${n.id}`);
    }
    assert.ok(done(s, ch.id, "boss"));
  }
  return { s, metrics };
}
test("complete campaign: 72 narrative locations, 24 solvable routes, all endings and save round-trip", () => {
  assert.equal(
    chapters.reduce((a, c) => a + c.nodes.length, 0),
    72,
  );
  const { s, metrics } = campaign();
  assert.equal(s.routes.length, 24);
  assert.equal(s.memories.length, 8);
  assert.equal(s.completed.length, 72);
  assert.equal(s.unlocked, 7);
  for (const id of Object.keys(endings)) {
    const end = chooseEnding(s, id);
    assert.equal(end.ending, id);
    assert.deepEqual(validateSave(JSON.parse(JSON.stringify(end))).ending, id);
  }
  console.log("Campaign coverage:", metrics);
});
test("low-autonomy route still finishes, optional memories stay optional, dawn stays locked", () => {
  const { s } = campaign(1, false);
  assert.equal(s.memories.length, 0);
  assert.equal(chooseEnding(s, "dawn"), s);
  assert.equal(chooseEnding(s, "road").ending, "road");
  assert.equal(chooseEnding(s, "keeper").ending, "keeper");
});
test("every route is connected, unique, reachable and has a feasible lamp/key solution", () => {
  const signatures = new Set();
  for (let ch = 0; ch < 8; ch++)
    for (let floor = 0; floor < 3; floor++) {
      const d = routeDefinition(ch, floor);
      assert.equal(d.rows.length, 11);
      assert.ok(d.rows.every((r) => r.length === 13));
      assert.equal(
        d.reachable,
        d.rows
          .join("")
          .split("")
          .filter((c) => c === ".").length,
      );
      assert.equal(Object.keys(d.tiles).length, 11);
      assert.ok(solveRoute(newExpedition(ch, floor)).length > 0);
      signatures.add(d.rows.join(""));
    }
  assert.equal(signatures.size, 24);
});
test("requirements lock chapter boss, repeated completions never duplicate rewards", () => {
  const s = freshState();
  assert.equal(resolveNode(s, 0, "boss"), s);
  assert.equal(createBattle(s, 0, "boss"), null);
  const once = resolveNode(s, 0, "porch");
  assert.ok(once.coins > s.coins);
  assert.equal(resolveNode(once, 0, "porch"), once);
  assert.equal(resolveNode(s, 0, "grave", 4), s);
  assert.equal(resolveNode(s, 0, "unknown"), s);
});
test("battle rejects invalid actions and unavailable resources without consuming turns", () => {
  const s = { ...freshState(), mp: 0, herbs: 0, oil: 0 },
    b = createBattle(s, 0, "path");
  for (const action of ["spell", "heal", "oil", "burst", "ally", "banana"]) {
    const result = battleAction(s, b, action);
    assert.equal(result.state, s);
    assert.equal(result.battle, b);
  }
  const next = battleAction(s, b, "attack");
  assert.equal(next.battle.round, 1);
  assert.ok(next.battle.mp >= 1);
  assert.ok(next.battle.enemyHp < b.enemyHp);
});
test("telegraphed heavy attack can be guarded and breaking poise interrupts enemy action", () => {
  let s = freshState(),
    b = createBattle(s, 0, "path");
  b.round = 2;
  const exposed = battleAction(s, b, "attack"),
    guarded = battleAction(s, b, "guard");
  assert.ok(exposed.battle.heroHp < guarded.battle.heroHp);
  assert.ok(guarded.battle.heroHp > 100);
  b.poise = 1;
  const interrupted = battleAction(s, b, "spell");
  assert.equal(interrupted.battle.heroHp, s.hp);
  assert.equal(interrupted.battle.poise, 3);
});
test("defeat keeps narrative and inventory; restart restores health without granting rewards", () => {
  let s = resolveNode(freshState(), 0, "porch"),
    b = createBattle({ ...s, hp: 1 }, 0, "path");
  const r = battleAction({ ...s, hp: 1 }, b, "attack");
  assert.equal(r.battle.status, "lost");
  assert.ok(!done(r.state, 0, "path"));
  assert.ok(done(r.state, 0, "porch"));
  const restarted = rest(r.state);
  assert.equal(restarted.hp, stats(s).maxHp);
  assert.equal(restarted.coins, s.coins);
});
test("invalid and hostile saves do not overwrite valid progress; backup recovers corruption", () => {
  const memory = new Map(),
    storage = {
      getItem: (k) => memory.get(k) || null,
      setItem: (k, v) => memory.set(k, v),
    };
  const s = { ...resolveNode(freshState(), 0, "porch"), started: true };
  writeSave(storage, s);
  writeSave(storage, resolveNode(s, 0, "shed"));
  assert.ok(memory.has(BACKUP_KEY));
  memory.set(SAVE_KEY, "{broken");
  assert.ok(done(readSave(storage), 0, "porch"));
  for (const edit of [
    (s) => (s.version = 999),
    (s) => (s.coins = -1),
    (s) => (s.chapter = 7),
    (s) => (s.completed = ["0:boss"]),
    (s) => (s.routes = ["7.2"]),
    (s) => (s.gear.blade = 100),
    (s) => (s.ending = "dawn"),
    (s) => (s.hp = 999),
    (s) => (s.expedition = { chapter: 999 }),
  ]) {
    const bad = structuredClone(s);
    edit(bad);
    assert.throws(() => validateSave(bad));
  }
  const injected = structuredClone(s);
  injected.journal = [{ text: "<script>alert(1)</script>" }];
  assert.ok(!JSON.stringify(validateSave(injected)).includes("<script>"));
});
test("equipment and supplies have finite costs, cap at five, cannot create negative money", () => {
  let s = { ...freshState(), coins: 20 };
  assert.equal(upgrade(s, "blade"), s);
  assert.equal(buy(s, "nope"), s);
  const bought = buy(s, "herbs");
  assert.equal(bought.coins, 8);
  assert.equal(bought.herbs, s.herbs + 1);
  assert.equal(buy(bought, "oil"), bought);
  s = { ...s, coins: 10000 };
  for (let i = 0; i < 9; i++) s = upgrade(s, "blade");
  assert.equal(s.gear.blade, 5);
  const before = s.coins;
  assert.equal(upgrade(s, "blade").coins, before);
});
test("route movement respects walls, progress persists, and supply caches do not respawn", () => {
  let s = enterExpedition({ ...freshState(), started: true }, 0),
    ex = s.expedition,
    d = routeDefinition(0, 0);
  assert.deepEqual(moveExpedition(s, -1, 0).state, s);
  const loaded = validateSave(JSON.parse(JSON.stringify(s)));
  assert.equal(loaded.expedition.x, ex.x);
  assert.equal(loaded.expedition.runes.join(""), ex.runes.join(""));
  assert.equal(moveExpedition(s, 9, 0).state, s);
  const [cell] = Object.entries(d.tiles).find(
    ([, feature]) => feature === "chest",
  );
  const [cx, cy] = cell.split(",").map(Number);
  const [dx, dy] = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ].find(([dx, dy]) => d.rows[cy - dy]?.[cx - dx] === ".");
  s.expedition.x = cx - dx;
  s.expedition.y = cy - dy;
  const first = moveExpedition(s, dx, dy).state;
  assert.equal(first.herbs, s.herbs + 1);
  assert.ok(first.coins > s.coins);
  const second = moveExpedition(
    moveExpedition(first, -dx, -dy).state,
    dx,
    dy,
  ).state;
  assert.equal(second.herbs, first.herbs);
  assert.equal(second.coins, first.coins);
});
