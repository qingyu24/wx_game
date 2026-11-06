export const ROLL_COOLDOWN = 1.1;
export const HEAL_COOLDOWN = 5;
export function movementVector(keys, analog = { x: 0, y: 0 }) {
  const length = Math.hypot(analog.x, analog.y);
  if (length > 0.15)
    return {
      x: analog.x / length,
      y: analog.y / length,
      strength: Math.min(1, (length - 0.15) / 0.85),
    };
  const x =
    Number(keys.has("d") || keys.has("arrowright")) -
    Number(keys.has("a") || keys.has("arrowleft"));
  const y =
    Number(keys.has("s") || keys.has("arrowdown")) -
    Number(keys.has("w") || keys.has("arrowup"));
  const d = Math.hypot(x, y);
  return { x: d ? x / d : 0, y: d ? y / d : 0, strength: d ? 1 : 0 };
}
export function rollDirection(keys, analog, facing) {
  const v = movementVector(keys, analog);
  return v.strength ? { x: v.x, y: v.y } : { ...facing };
}
export function cameraScale(width, height, touch) {
  if (touch && width > height)
    return Math.max(0.58, Math.min(0.9, width / 1050, height / 550));
  if (touch) return Math.max(0.65, Math.min(1.15, height / 1000));
  return Math.max(0.65, Math.min(1.1, width / 1000));
}
