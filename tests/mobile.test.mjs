import test from "node:test";
import assert from "node:assert/strict";
import {
  movementVector,
  rollDirection,
  cameraScale,
  ROLL_COOLDOWN,
} from "../src/rpg/mobile.mjs";
test("thumb dead zone stops drift and partial thumb travel allows slower movement", () => {
  assert.deepEqual(movementVector(new Set(), { x: 0.1, y: 0.1 }), {
    x: 0,
    y: 0,
    strength: 0,
  });
  const small = movementVector(new Set(), { x: 0.35, y: 0 }),
    full = movementVector(new Set(), { x: 1, y: 0 });
  assert(small.strength > 0 && small.strength < full.strength);
  assert.equal(full.strength, 1);
  assert.equal(small.x, 1);
});
test("roll follows the held thumb direction instead of the attack-facing direction", () => {
  const direction = rollDirection(new Set(), { x: -1, y: 0 }, { x: 1, y: 0 });
  assert.deepEqual(direction, { x: -1, y: 0 });
  assert.deepEqual(
    rollDirection(new Set(["w"]), { x: 0, y: 0 }, { x: 1, y: 0 }),
    { x: 0, y: -1 },
  );
  assert.deepEqual(rollDirection(new Set(), { x: 0, y: 0 }, { x: 0, y: 1 }), {
    x: 0,
    y: 1,
  });
  assert(
    ROLL_COOLDOWN > 0.28,
    "invulnerability cannot cover the whole cooldown",
  );
});
test("landscape phone camera leaves a playable field around a readable character", () => {
  const scale = cameraScale(844, 390, true);
  assert(scale > 0.6 && scale < 0.8);
  assert(99 * scale < 80);
  assert(cameraScale(390, 844, true) >= 0.8);
});
