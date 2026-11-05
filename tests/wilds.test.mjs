import test from "node:test";
import assert from "node:assert/strict";
import { freshState, validateSave } from "../src/rpg/engine.mjs";
import {
  blocked,
  moveHero,
  hitEnemies,
  claimWildReward,
  findPath,
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
