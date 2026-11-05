import { createPlatformStorage } from "../src/rpg/storage.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { freshState, validateSave } from "../src/rpg/engine.mjs";
import {
  blocked,
  moveHero,
  hitEnemies,
  claimWildReward,
  findPath,
  wildProgress,
  attackProfile,
  enemyProfile,
} from "../src/rpg/wilds.mjs";
test("river blocks travel except at bridges, and diagonal sliding respects banks", () => {
  assert.equal(blocked(675, 500), true);
  assert.equal(blocked(675, 720), false);
  assert.equal(blocked(675, 300), false);
  assert.deepEqual(moveHero({ x: 625, y: 500 }, 15, 10), { x: 625, y: 510 });
});
test("melee is directional, lantern is radial, dead enemies cannot be hit again", () => {
  const enemies = [
    { x: 50, y: 0, hp: 100 },
    { x: -50, y: 0, hp: 100 },
    { x: 200, y: 0, hp: 100 },
    { x: 40, y: 0, hp: 0 },
  ];
  assert.deepEqual(
    hitEnemies(enemies, { x: 0, y: 0 }, { x: 1, y: 0 }).map((e) => e.hp),
    [66, 100, 100, 0],
  );
  assert.deepEqual(
    hitEnemies(enemies, { x: 0, y: 0 }, { x: 1, y: 0 }, true).map((e) => e.hp),
    [35, 35, 100, 0],
  );
  assert.equal(enemies[0].hp, 100);
});
test("finite wild rewards survive save round-trip and cannot be farmed", () => {
  const s = freshState(),
    next = claimWildReward(s, "0:chest0");
  assert.equal(next.coins, s.coins + 24);
  assert.equal(next.herbs, s.herbs + 1);
  const saved = validateSave(JSON.parse(JSON.stringify(next)));
  assert.deepEqual(saved.wilds, ["0:chest0"]);
  assert.equal(claimWildReward(saved, "0:chest0"), saved);
  assert.equal(claimWildReward(s, "7:enemy0"), s);
  assert.equal(claimWildReward(s, "0:enemy99"), s);
  const old = { ...s };
  delete old.wilds;
  assert.deepEqual(validateSave(old).wilds, []);
  assert.throws(() => validateSave({ ...s, wilds: ["9:chest0"] }));
  assert.throws(() => validateSave({ ...s, wilds: ["0:enemy0", "0:enemy0"] }));
});

test("click routing uses bridges to reach the opposite bank", () => {
  const route = findPath({ x: 530, y: 500 }, { x: 950, y: 500 });
  assert(route.length > 0);
  assert(route.some((p) => p.y >= 680 || p.y <= 346));
  assert(route.every((p) => !blocked(p.x, p.y)));
  assert.deepEqual(findPath({ x: 530, y: 500 }, { x: 675, y: 500 }), []);
});

test("bounty requires the entire clear and pays only once, with save compatibility", () => {
  let s = freshState();
  assert.equal(claimWildReward(s, "0:bounty"), s);
  for (let i = 0; i < 5; i++) s = claimWildReward(s, `0:enemy${i}`);
  for (let i = 0; i < 3; i++) s = claimWildReward(s, `0:chest${i}`);
  assert(wildProgress(s).ready);
  const next = claimWildReward(s, "0:bounty");
  assert.equal(next.coins, s.coins + 100);
  assert.equal(next.oil, s.oil + 1);
  assert.equal(claimWildReward(next, "0:bounty"), next);
  assert(wildProgress(validateSave(next)).claimed);
});
test("combo finisher and equipment increase melee power; enemy types differ", () => {
  assert(attackProfile(3).damage > attackProfile(1).damage);
  assert(attackProfile(3).range > attackProfile(1).range);
  assert(attackProfile(1, 3).damage > attackProfile(1).damage);
  assert(enemyProfile(1).speed > enemyProfile(2).speed);
  assert(enemyProfile(2).windup > enemyProfile(1).windup);
  assert(enemyProfile(0, 7).maxHp > enemyProfile(0, 0).maxHp);
});
test("world checkpoint is validated and survives import/export", () => {
  const s = { ...freshState(), wildPosition: { chapter: 0, x: 530, y: 700 } };
  assert.deepEqual(validateSave(s).wildPosition, s.wildPosition);
  assert.throws(() =>
    validateSave({ ...s, wildPosition: { chapter: 0, x: 675, y: 500 } }),
  );
  assert.throws(() =>
    validateSave({ ...s, wildPosition: { chapter: 7, x: 530, y: 700 } }),
  );
});

test("same validated save format works through WeChat synchronous storage port", () => {
  const data = new Map(),
    wx = {
      getStorageSync: (k) => data.get(k) || "",
      setStorageSync: (k, v) => data.set(k, v),
      removeStorageSync: (k) => data.delete(k),
    };
  const storage = createPlatformStorage({ wx });
  assert.equal(storage.getItem("missing"), null);
  storage.setItem("save", JSON.stringify(freshState()));
  assert.equal(validateSave(JSON.parse(storage.getItem("save"))).version, 1);
  storage.removeItem("save");
  assert.equal(storage.getItem("save"), null);
  const web = { getItem: () => null };
  assert.equal(createPlatformStorage({ localStorage: web }), web);
});
