// Hand-painted production atlases. Frame bounds are measured once, never per game frame.
const sources = {
  village: "./art/rework/village.webp",
  cast: "./art/rework/characters.webp",
  monsters: "./art/rework/monsters.webp",
  walk: "./art/rework/hero-walk.webp",
  actions: "./art/rework/hero-actions.webp",
  props: "./art/rework/props.webp",
};
let pending;
export function loadPaintedAssets() {
  if (!pending)
    pending = Promise.all(
      Object.entries(sources).map(async ([key, src]) => {
        const image = new Image();
        image.src = new URL(src, document.baseURI).href;
        await image.decode();
        const columns = key === "village" ? 1 : 4,
          rows = ["walk", "actions"].includes(key) ? 4 : 1;
        const frames =
          key === "village" ? [] : measureFrames(image, columns, rows);
        return [key, { image, frames }];
      }),
    )
      .then(Object.fromEntries)
      .catch((error) => {
        pending = null;
        throw error;
      });
  return pending;
}
function measureFrames(image, columns, rows) {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, image.width, image.height).data,
    frames = [];
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < columns; col++) {
      const left = Math.floor((col * image.width) / columns),
        top = Math.floor((row * image.height) / rows),
        right = Math.floor(((col + 1) * image.width) / columns),
        bottom = Math.floor(((row + 1) * image.height) / rows);
      let x0 = right,
        y0 = bottom,
        x1 = left,
        y1 = top;
      for (let y = top; y < bottom; y++)
        for (let x = left; x < right; x++)
          if (pixels[(y * image.width + x) * 4 + 3] > 24) {
            x0 = Math.min(x0, x);
            x1 = Math.max(x1, x);
            y0 = Math.min(y0, y);
            y1 = Math.max(y1, y);
          }
      frames.push(
        x1 >= x0
          ? { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
          : { x: left, y: top, w: right - left, h: bottom - top },
      );
    }
  return frames;
}
export function directionIndex(face) {
  return Math.abs(face.y) > 0.55 ? (face.y < 0 ? 1 : 0) : face.x < 0 ? 3 : 2;
}
export function drawCutout(ctx, asset, index, x, y, height, options = {}) {
  const box = asset.frames[index % asset.frames.length];
  if (!box) return;
  const width = (height * box.w) / box.h;
  ctx.save();
  ctx.translate(x, y);
  if (options.flip) ctx.scale(-1, 1);
  if (options.tilt) ctx.rotate(options.tilt);
  ctx.globalAlpha = options.alpha ?? 1;
  ctx.drawImage(
    asset.image,
    box.x,
    box.y,
    box.w,
    box.h,
    -width / 2,
    -height,
    width,
    height,
  );
  ctx.restore();
}
export function drawPaintedHero(ctx, assets, world) {
  const direction = directionIndex(
      world.slash > 0 ? world.swingFace || world.face : world.face,
    ),
    frame = world.walk
      ? Math.floor((world.walkPhase ?? world.time) * 9) % 4
      : 1;
  let atlas = assets.walk,
    index = direction * 4 + frame,
    height = 99;
  if (world.dash > 0) {
    atlas = assets.actions;
    index = 12 + direction;
    height = 75;
  } else if (world.hurt > 0) {
    atlas = assets.actions;
    index = 8 + direction;
  } else if (world.slash > 0) {
    atlas = assets.actions;
    index = direction;
    height = 102;
  } else if (world.magic > 0.28) {
    atlas = assets.actions;
    index = 4 + direction;
    height = 108;
  }
  const fading =
    world.inv > 0 && world.dash <= 0 && Math.floor(world.time * 14) % 2;
  if (world.dash > 0)
    for (let i = 3; i >= 1; i--)
      drawCutout(
        ctx,
        atlas,
        index,
        world.p.x - world.face.x * i * 17,
        world.p.y - world.face.y * i * 17,
        height,
        { alpha: 0.08 * (4 - i) },
      );
  drawCutout(ctx, atlas, index, world.p.x, world.p.y, height, {
    alpha: fading ? 0.45 : 1,
  });
}
