import React, { useEffect, useRef, useState } from "react";
import { Swords, Flame, Wind, Heart, Crosshair } from "lucide-react";
import { loadPaintedAssets, drawCutout, drawPaintedHero } from "./painted.mjs";
import { chapters } from "./content.mjs";
import { done, requirements, stats } from "./engine.mjs";
import {
  WORLD,
  LAYOUT_VERSION,
  riverCenter,
  camp,
  caches,
  spawns,
  nodePoint,
  moveHero,
  claimWildReward,
  hitEnemies,
  findPath,
  wildProgress,
  attackProfile,
  enemyProfile,
} from "./wilds.mjs";
import "./action-world.css";
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const noise = (x, y) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};
export default function ActionWorld({
  state,
  onChange,
  onNode,
  busy,
  reducedMotion,
}) {
  const canvas = useRef(),
    live = useRef(),
    input = useRef(new Set()),
    analog = useRef({ x: 0, y: 0 }),
    stickPointer = useRef(null),
    artRef = useRef(null),
    [artStatus, setArtStatus] = useState("loading"),
    [stick, setStick] = useState({ x: 0, y: 0 }),
    controls = useRef(),
    [guide, setGuide] = useState(false),
    [hud, setHud] = useState({
      hp: state.hp,
      mp: state.mp,
      near: null,
      kills: 0,
      message: "沿石径探索 · 靠近人物按 E 交谈",
      cooldown: 0,
    });
  const props = useRef();
  props.current = {
    state,
    onChange,
    onNode,
    busy: busy || guide || artStatus !== "ready",
    reducedMotion,
  };
  useEffect(() => {
    let active = true;
    loadPaintedAssets()
      .then((assets) => {
        if (active) {
          artRef.current = assets;
          setArtStatus("ready");
        }
      })
      .catch(() => {
        if (active) setArtStatus("error");
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    const chapter = state.chapter;
    const world = {
      p:
        state.wildPosition?.chapter === chapter
          ? { x: state.wildPosition.x, y: state.wildPosition.y }
          : { x: camp.x + 42, y: camp.y + 28 },
      face: { x: 1, y: 0 },
      enemies: spawns.map((p, i) => ({
        ...p,
        id: `${chapter}:enemy${i}`,
        ...enemyProfile(i, chapter),
        hp: state.wilds?.includes(`${chapter}:enemy${i}`)
          ? 0
          : enemyProfile(i, chapter).maxHp,
        wind: 0,
        wait: 0,
        flash: 0,
      })),
      hp: state.hp,
      mp: state.mp,
      slash: 0,
      magic: 0,
      dash: 0,
      inv: 0,
      cd: 0,
      attackCd: 0,
      time: 0,
      combo: 0,
      comboTime: 0,
      savedAt: 0,
      savedPoint: { ...camp },
      effects: [],
      hurt: 0,
      tracked: null,
      locked: null,
      queued: null,
      hitstop: 0,
      particles: [],
      projectiles: [],
      repath: 0,
      message: "沿石径探索 · 靠近人物按 E 交谈",
      messageTime: 0,
      target: null,
      near: null,
    };
    live.current = world;
    const el = canvas.current,
      ctx = el.getContext("2d");
    let frame,
      last = 0,
      ui = 0,
      hidden = false;
    const persist = () =>
      props.current.onChange((s) => ({
        ...s,
        hp: Math.max(1, Math.round(world.hp)),
        mp: world.mp,
        wildPosition: {
          chapter,
          x: world.p.x,
          y: world.p.y,
          layoutVersion: LAYOUT_VERSION,
        },
      }));
    const message = (t) => {
      world.message = t;
      world.messageTime = world.time;
    };
    function strike(magic, power) {
      const before = world.enemies;
      world.enemies = hitEnemies(before, world.p, world.face, magic, power);
      let connected = false;
      world.enemies.forEach((e, i) => {
        const damage = before[i].hp - e.hp;
        if (damage > 0) {
          connected = true;
          world.hitstop = magic ? 0.025 : 0.045;
          const d = distance(e, world.p) || 1;
          if (!magic) {
            const pos = moveHero(
              e,
              ((e.x - world.p.x) / d) * (world.combo === 3 ? 25 : 10),
              ((e.y - world.p.y) / d) * (world.combo === 3 ? 25 : 10),
            );
            e.x = pos.x;
            e.y = pos.y;
            e.stagger = 0.14;
          }
          for (let j = 0; j < 7; j++)
            world.particles.push({
              x: e.x,
              y: e.y - 30,
              vx: (Math.random() - 0.5) * 140,
              vy: -35 - Math.random() * 70,
              life: 0.3 + Math.random() * 0.3,
              color: magic ? "#98d8d3" : "#efd29b",
            });
          world.effects.push({
            x: e.x,
            y: e.y - 45,
            text: `-${damage}`,
            life: 0.75,
            color: magic ? "#a6e7dc" : "#ffe2a0",
          });
          if (!magic && world.combo === 3 && (e.type !== 2 || e.wind < 0.45)) {
            e.wind = 0;
            e.wait = 0.8;
          }
        }
      });
      if (connected && !magic) {
        world.mp = Math.min(6, world.mp + 1);
        persist();
      }
    }
    function navigate(target) {
      world.route = findPath(world.p, target);
      world.target = world.route.shift() || null;
      world.tracked = target;
      if (world.target)
        message(`前往 ${target.name || "标记处"} · 可随时移动取消`);
    }
    function action(kind) {
      if (props.current.busy || hidden) return;
      if (kind === "attack" && world.attackCd <= 0) {
        const target = world.enemies
          .filter((e) => e.hp > 0 && distance(e, world.p) < 140)
          .sort((a, b) => distance(a, world.p) - distance(b, world.p))[0];
        if (target) {
          const d = distance(target, world.p) || 1;
          world.face = {
            x: (target.x - world.p.x) / d,
            y: (target.y - world.p.y) / d,
          };
        }
        world.combo = world.comboTime > 0 ? (world.combo % 3) + 1 : 1;
        world.comboTime = 1;
        world.swingFace = { ...world.face };
        world.slash = 0.24;
        world.attackCd = world.combo === 3 ? 0.5 : 0.3;
        strike(
          false,
          attackProfile(world.combo, props.current.state.gear.blade),
        );
      }
      if (kind === "magic" && world.cd <= 0) {
        if (world.mp < 2) {
          message("灵力不足，靠近营火恢复");
          return;
        }
        world.mp -= 2;
        world.magic = 0.6;
        world.cd = 3;
        strike(true, {
          damage: 65 + (props.current.state.gear.lantern - 1) * 10,
        });
        persist();
      }
      if (kind === "dash" && world.dash <= 0 && world.inv <= 0) {
        world.dash = 0.18;
        world.inv = 0.65;
      }
      if (kind === "interact" && world.near) {
        const n = world.near;
        if (n.kind === "camp") {
          world.hp = stats(props.current.state).maxHp;
          world.mp = 6;
          persist();
          const progress = wildProgress(props.current.state);
          if (progress.ready && !progress.claimed) {
            props.current.onChange((s) =>
              claimWildReward(s, `${chapter}:bounty`),
            );
            message("清雾委托完成 · +100铜钱 · +60阅历 · +1灯油");
          } else message("营火休整 · 生命与灵力已恢复");
        } else if (n.kind === "chest") {
          persist();
          props.current.onChange((s) => claimWildReward(s, n.id));
          message("获得 24 铜钱 · 10 阅历 · 1 药草");
        } else {
          persist();
          props.current.onNode(n);
        }
      }
      if (kind === "heal" && world.hp < stats(props.current.state).maxHp) {
        if (props.current.state.herbs <= 0) {
          message("药草用尽，回营火休整");
          return;
        }
        world.hp = Math.min(stats(props.current.state).maxHp, world.hp + 55);
        props.current.onChange((s) => ({
          ...s,
          herbs: s.herbs - 1,
          hp: Math.round(world.hp),
        }));
        message("使用药草 · 恢复 55 生命");
      }
    }
    controls.current = (kind) => {
      if (props.current.busy || hidden) return;
      const s = props.current.state;
      const hunt = (enemy) => {
        if (!enemy) return;
        world.locked = enemy.id;
        world.queued = null;
        navigate({ ...enemy, name: enemy.name });
      };
      if (typeof kind === "object" && kind.point) {
        const point = kind.point,
          enemy = world.enemies
            .filter((e) => e.hp > 0 && distance(e, point) < 55)
            .sort((a, b) => distance(a, point) - distance(b, point))[0];
        if (enemy) {
          hunt(enemy);
          return;
        }
        const features = [
          { ...camp, kind: "camp", name: "营火" },
          ...caches
            .map((p, i) => ({
              ...p,
              kind: "chest",
              name: "旧木箱",
              id: `${chapter}:chest${i}`,
            }))
            .filter((n) => !s.wilds?.includes(n.id)),
          ...chapters[chapter].nodes.map((n) => ({ ...n, ...nodePoint(n) })),
        ];
        const feature = features
          .filter((n) => distance(n, point) < 45)
          .sort((a, b) => distance(a, point) - distance(b, point))[0];
        world.locked = null;
        world.queued = feature || null;
        navigate(feature || point);
      } else if (kind === "hunt")
        hunt(
          world.enemies
            .filter((e) => e.hp > 0)
            .sort((a, b) => distance(a, world.p) - distance(b, world.p))[0],
        );
      else if (kind === "track") {
        const chest = caches
          .map((p, i) => ({
            ...p,
            name: "未开启的木箱",
            id: `${chapter}:chest${i}`,
          }))
          .filter((p) => !s.wilds?.includes(p.id))
          .sort((a, b) => distance(a, world.p) - distance(b, world.p))[0];
        const enemy = world.enemies
          .filter((e) => e.hp > 0)
          .sort((a, b) => distance(a, world.p) - distance(b, world.p))[0];
        world.locked = null;
        world.queued = null;
        navigate(chest || enemy || { ...camp, name: "营火 · 交付委托" });
      } else if (kind === "camp") {
        world.locked = null;
        world.queued = null;
        navigate({ ...camp, name: "营火" });
      } else if (kind === "story") {
        const n = chapters[chapter].nodes.find(
          (n) =>
            n.kind !== "side" &&
            !done(s, chapter, n.id) &&
            !requirements(s, chapter, n).length,
        );
        if (n) {
          world.locked = null;
          world.queued = null;
          navigate({ ...nodePoint(n), name: n.name });
        }
      } else action(kind);
    };
    const key = (e) => {
      if (props.current.busy || e.target.closest("input,select,textarea"))
        return;
      const k = e.key.toLowerCase();
      if (
        [
          "w",
          "a",
          "s",
          "d",
          "arrowup",
          "arrowdown",
          "arrowleft",
          "arrowright",
          " ",
          "j",
          "k",
          "q",
          "e",
          "h",
        ].includes(k)
      ) {
        e.preventDefault();
        e.stopImmediatePropagation();
        input.current.add(k);
        if (!e.repeat)
          action(
            {
              j: "attack",
              k: "magic",
              q: "magic",
              " ": "dash",
              e: "interact",
              h: "heal",
            }[k],
          );
      }
    };
    const up = (e) => input.current.delete(e.key.toLowerCase());
    const blur = () => input.current.clear();
    const visibility = () => {
      hidden = document.hidden;
      blur();
    };
    document.addEventListener("keydown", key, true);
    document.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", visibility);
    function rect(x, y, w, h, color) {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x), Math.round(y), w, h);
    }
    function ellipse(x, y, rx, ry, color) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    function label(x, y, text, color = "#e9dbc0") {
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      const w = ctx.measureText(text).width;
      rect(x - w / 2 - 9, y - 15, w + 18, 22, "#142923e8");
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
    }
    function render(dt) {
      const { state: s, busy: paused } = props.current;
      const w = world;
      const realDt = dt;
      if (w.hitstop > 0) {
        w.hitstop = Math.max(0, w.hitstop - realDt);
        dt = 0;
      }
      w.time += paused || hidden ? 0 : dt;
      if (w.time - (w.messageTime || 0) > 7) w.message = "";
      if (!paused && !hidden) {
        for (const k of [
          "slash",
          "magic",
          "dash",
          "inv",
          "cd",
          "attackCd",
          "comboTime",
          "hurt",
        ])
          w[k] = Math.max(0, w[k] - dt);
        w.effects = w.effects.filter((e) => {
          e.life -= dt;
          e.y -= dt * 28;
          return e.life > 0;
        });
        const keys = input.current;
        if (keys.has("j") || keys.has("attack")) action("attack");
        let dx =
            (keys.has("d") || keys.has("arrowright") ? 1 : 0) -
            (keys.has("a") || keys.has("arrowleft") ? 1 : 0),
          dy =
            (keys.has("s") || keys.has("arrowdown") ? 1 : 0) -
            (keys.has("w") || keys.has("arrowup") ? 1 : 0);
        if (Math.hypot(analog.current.x, analog.current.y) > 0.15) {
          dx = analog.current.x;
          dy = analog.current.y;
        }
        const len = Math.hypot(dx, dy);
        w.repath = Math.max(0, w.repath - dt);
        if (w.locked) {
          const enemy = w.enemies.find((e) => e.id === w.locked && e.hp > 0);
          if (!enemy) {
            w.locked = null;
            w.target = null;
            w.route = [];
          } else if (!len && w.dash <= 0) {
            if (distance(enemy, w.p) < 88) {
              w.target = null;
              w.route = [];
              action("attack");
            } else if (w.repath <= 0) {
              w.route = findPath(w.p, enemy);
              w.target = w.route.shift() || null;
              w.repath = 0.45;
            }
          }
        }
        w.walk = !!len;
        if (len) {
          dx /= len;
          dy /= len;
          w.face = { x: dx, y: dy };
          w.target = null;
          w.route = [];
          w.queued = null;
        } else if (w.target) {
          const d = distance(w.p, w.target);
          if (d < 8) w.target = w.route?.shift() || null;
          else {
            dx = (w.target.x - w.p.x) / d;
            dy = (w.target.y - w.p.y) / d;
            w.face = { x: dx, y: dy };
            w.walk = true;
          }
        }
        if (w.dash > 0) {
          dx = w.face.x;
          dy = w.face.y;
          w.target = null;
          w.route = [];
        }
        const speed = w.dash > 0 ? 630 : 185;
        w.p = moveHero(w.p, dx * dt * speed, dy * dt * speed);
        w.enemies.forEach((e) => {
          e.flash = Math.max(0, e.flash - dt);
          e.stagger = Math.max(0, (e.stagger || 0) - dt);
          e.attackFlash = Math.max(0, (e.attackFlash || 0) - dt);
          if (e.hp <= 0) {
            if (!s.wilds?.includes(e.id) && !e.rewarded) {
              e.rewarded = true;
              props.current.onChange((v) => claimWildReward(v, e.id));
              message("击退雾灵 · +12 铜钱 · +18 阅历");
            }
            return;
          }
          e.wait = Math.max(0, e.wait - dt);
          const d = distance(e, w.p);
          if (e.wind > 0) {
            e.wind -= dt;
            if (e.wind <= 0) {
              e.wait = e.recovery;
              e.attackFlash = 0.28;
              if (e.type === 0) {
                const aim = e.aim || w.p,
                  len = Math.hypot(aim.x - e.x, aim.y - e.y) || 1;
                w.projectiles.push({
                  x: e.x,
                  y: e.y - 8,
                  vx: ((aim.x - e.x) / len) * 215,
                  vy: ((aim.y - e.y) / len) * 215,
                  life: 3,
                  damage: e.damage,
                });
              }
              if (e.type !== 0 && d < e.radius && w.inv <= 0) {
                w.hp = Math.max(0, w.hp - e.damage);
                w.inv = 0.6;
                w.hurt = 0.2;
                w.effects.push({
                  x: w.p.x,
                  y: w.p.y - 55,
                  text: `-${e.damage}`,
                  life: 0.7,
                  color: "#f2a18f",
                });
                persist();
                message("受到攻击 · 留意红圈，空格闪避");
              }
            }
          } else if (e.stagger > 0) {
          } else if (d < (e.type === 0 ? 180 : e.radius - 14) && e.wait <= 0) {
            e.wind = e.windup * (e.type === 2 && e.hp < e.maxHp / 2 ? 0.72 : 1);
            e.aim = { ...w.p };
          } else if (d < 270 && d > 48) {
            const p = moveHero(
              e,
              ((w.p.x - e.x) / d) * e.speed * dt,
              ((w.p.y - e.y) / d) * e.speed * dt,
            );
            e.x = p.x;
            e.y = p.y;
          }
        });
        w.projectiles = w.projectiles.filter((projectile) => {
          projectile.x += projectile.vx * dt;
          projectile.y += projectile.vy * dt;
          projectile.life -= dt;
          if (distance(projectile, w.p) < 18 && w.inv <= 0) {
            w.hp = Math.max(0, w.hp - projectile.damage);
            w.inv = 0.6;
            w.hurt = 0.2;
            w.effects.push({
              x: w.p.x,
              y: w.p.y - 50,
              text: `-${projectile.damage}`,
              life: 0.7,
              color: "#f2a18f",
            });
            persist();
            return false;
          }
          return projectile.life > 0;
        });
        if (w.hp <= 0) {
          w.p = { x: camp.x + 42, y: camp.y + 28 };
          w.projectiles = [];
          w.locked = null;
          w.queued = null;
          w.target = null;
          w.route = [];
          w.hp = stats(s).maxHp;
          w.mp = 6;
          w.inv = 2;
          w.enemies.forEach((e, i) => {
            Object.assign(e, spawns[i], { wind: 0 });
          });
          persist();
          message("灯火将你带回营地 · 已完成的探索保留");
        }
        if (w.time - w.savedAt > 1.5 && distance(w.p, w.savedPoint) > 15) {
          w.savedAt = w.time;
          w.savedPoint = { ...w.p };
          persist();
        }
        const features = [
          { ...camp, kind: "camp", name: "营火 · 休整" },
          ...caches
            .map((p, i) => ({
              ...p,
              kind: "chest",
              name: "旧木箱 · 打开",
              id: `${chapter}:chest${i}`,
            }))
            .filter((n) => !s.wilds?.includes(n.id)),
          ...chapters[chapter].nodes.map((n) => ({ ...n, ...nodePoint(n) })),
        ];
        w.near =
          features
            .filter((n) => distance(n, w.p) < 85)
            .sort((a, b) => distance(a, w.p) - distance(b, w.p))[0] || null;
        if (w.queued && distance(w.queued, w.p) < 62) {
          const desired = w.queued;
          w.queued = null;
          w.target = null;
          w.route = [];
          w.near = desired;
          action("interact");
        }
        w.particles = w.particles.filter((p) => {
          p.life -= dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += 80 * dt;
          return p.life > 0;
        });
      }
      const box = el.getBoundingClientRect();
      const width = box.width,
        height = box.height;
      if (!width || !height) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      if (
        el.width !== Math.round(width * ratio) ||
        el.height !== Math.round(height * ratio)
      ) {
        el.width = Math.round(width * ratio);
        el.height = Math.round(height * ratio);
      }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      rect(0, 0, width, height, "#192f2c");
      const scale = Math.max(0.65, Math.min(1.1, width / 850));
      const desiredX = Math.max(
          0,
          Math.min(WORLD.width - width / scale, w.p.x - width / scale / 2),
        ),
        desiredY = Math.max(
          0,
          Math.min(WORLD.height - height / scale, w.p.y - height / scale / 2),
        );
      const smooth = 1 - Math.exp(-realDt * 8);
      const cx = w.camera
          ? w.camera.cx + (desiredX - w.camera.cx) * smooth
          : desiredX,
        cy = w.camera
          ? w.camera.cy + (desiredY - w.camera.cy) * smooth
          : desiredY;
      w.camera = { cx, cy, scale };
      const assets = artRef.current;
      if (!assets) return;
      ctx.save();
      ctx.scale(scale, scale);
      const shake =
        w.hurt > 0 && !props.current.reducedMotion
          ? Math.sin(w.time * 110) * 3
          : 0;
      ctx.translate(-cx + shake, -cy);
      ctx.drawImage(assets.village.image, 0, 0, WORLD.width, WORLD.height);
      caches.forEach((p, i) => {
        const opened = s.wilds?.includes(`${chapter}:chest${i}`);
        drawCutout(
          ctx,
          assets.props,
          opened ? 1 : 0,
          p.x,
          p.y,
          opened ? 34 : 39,
        );
      });
      drawCutout(ctx, assets.props, 2, camp.x, camp.y, 46);
      const campGlow = ctx.createRadialGradient(
        camp.x,
        camp.y - 20,
        3,
        camp.x,
        camp.y - 20,
        75,
      );
      campGlow.addColorStop(0, "#eeb56130");
      campGlow.addColorStop(1, "#eeb56100");
      ctx.fillStyle = campGlow;
      ctx.fillRect(camp.x - 80, camp.y - 90, 160, 150);
      const actors = [];
      chapters[chapter].nodes.forEach((n) => {
        const p = nodePoint(n);
        actors.push({ type: "node", n, x: p.x, y: p.y });
      });
      w.enemies
        .filter((e) => e.hp > 0)
        .forEach((e) => {
          if (e.wind > 0) {
            ellipse(e.x, e.y, e.radius, e.radius * 0.66, "#d76e5138");
            ctx.strokeStyle = "#e8a285";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(
              e.x,
              e.y,
              e.radius * (1 - e.wind / e.windup),
              e.radius * 0.66 * (1 - e.wind / e.windup),
              0,
              0,
              Math.PI * 2,
            );
            ctx.stroke();
          }
          if (e.id === w.locked) {
            ctx.strokeStyle = "#f2d4a0";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(e.x, e.y + 2, 32, 11, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
          actors.push({ type: "enemy", e, x: e.x, y: e.y });
        });
      actors.push({ type: "hero", x: w.p.x, y: w.p.y });
      actors.sort((a, b) => a.y - b.y);
      for (const actor of actors) {
        if (actor.type === "hero") {
          ellipse(w.p.x, w.p.y + 2, 15, 6, "#0a181d77");
          drawPaintedHero(ctx, assets, w);
        } else if (actor.type === "enemy") {
          const e = actor.e,
            index = Number(e.id.at(-1)) % 3,
            dx = w.p.x - e.x,
            dy = w.p.y - e.y,
            d = Math.hypot(dx, dy) || 1;
          const lunge = Math.sin(((e.attackFlash || 0) / 0.28) * Math.PI) * 14;
          const bob =
            index === 0
              ? Math.sin(w.time * 5 + e.x) * 4
              : Math.sin(w.time * 3) * 1.5;
          ellipse(e.x, e.y + 3, index === 2 ? 23 : 20, 8, "#0b1a2077");
          ctx.save();
          if (e.flash > 0) ctx.filter = "brightness(1.8)";
          drawCutout(
            ctx,
            assets.monsters,
            index,
            e.x + (dx / d) * lunge,
            e.y + (dy / d) * lunge + bob,
            index === 0 ? 82 : index === 1 ? 72 : 114,
            {
              flip: index === 1 && dx > 0,
              tilt: e.wind > 0 ? Math.sin(w.time * 12) * 0.025 : 0,
            },
          );
          ctx.restore();
          const barY = e.y - (index === 2 ? 126 : 94);
          rect(e.x - 24, barY, 48, 4, "#17232b");
          rect(e.x - 24, barY, (48 * e.hp) / e.maxHp, 4, "#bc8371");
          if (distance(e, w.p) < 180 || e.id === w.locked)
            label(e.x, barY - 8, e.name, "#edc7ad");
        } else {
          const n = actor.n,
            p = actor,
            complete = done(s, chapter, n.id),
            locked = requirements(s, chapter, n).length > 0;
          if (["talk", "side", "choice"].includes(n.kind)) {
            const speaker = n.lines?.[0]?.speaker || "",
              who = speaker.includes("沈栖")
                ? 3
                : speaker.includes("阿绫")
                  ? 2
                  : speaker.includes("沈砚")
                    ? 0
                    : 1;
            ellipse(p.x, p.y + 2, 15, 6, "#0b1a2066");
            drawCutout(ctx, assets.cast, who, p.x, p.y, 99);
          } else if (n.kind === "boss")
            drawCutout(ctx, assets.monsters, 3, p.x, p.y, 152, {
              alpha: complete ? 0.35 : locked ? 0.65 : 1,
            });
          else
            drawCutout(
              ctx,
              assets.props,
              3,
              p.x,
              p.y,
              n.kind === "dungeon" ? 62 : 40,
              { alpha: complete ? 0.5 : 1 },
            );
          if (distance(p, w.p) < 230 || w.tracked?.name === n.name)
            label(
              p.x,
              p.y -
                (["talk", "side", "choice"].includes(n.kind)
                  ? 111
                  : n.kind === "boss"
                    ? 164
                    : 62),
              `${complete ? "✓ " : locked ? "· " : ""}${n.name}`,
              complete ? "#a8cbb9" : locked ? "#a9b5b9" : "#eee0bd",
            );
        }
      }
      for (const projectile of w.projectiles) {
        const glow = ctx.createRadialGradient(
          projectile.x,
          projectile.y,
          1,
          projectile.x,
          projectile.y,
          20,
        );
        glow.addColorStop(0, "#f3e1b9");
        glow.addColorStop(0.3, "#93d5cfb0");
        glow.addColorStop(1, "#93d5cf00");
        ctx.fillStyle = glow;
        ctx.fillRect(projectile.x - 20, projectile.y - 20, 40, 40);
        ellipse(projectile.x, projectile.y, 4, 4, "#f9edcb");
      }
      for (const particle of w.particles) {
        ctx.globalAlpha = Math.min(1, particle.life * 3);
        ellipse(particle.x, particle.y, 2, 2, particle.color);
        ctx.globalAlpha = 1;
      }
      if (w.slash > 0) {
        const a = Math.atan2(
          (w.swingFace || w.face).y,
          (w.swingFace || w.face).x,
        );
        ctx.strokeStyle = "#ffe4a6";
        ctx.lineWidth = 9;
        ctx.beginPath();
        ctx.arc(w.p.x, w.p.y - 14, w.combo === 3 ? 95 : 65, a - 1.1, a + 1.1);
        ctx.stroke();
        ctx.strokeStyle = "#fff4d4";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      if (w.magic > 0) {
        const glow = ctx.createRadialGradient(
          w.p.x,
          w.p.y - 25,
          5,
          w.p.x,
          w.p.y - 25,
          170 * (1 - w.magic / 0.6) + 10,
        );
        glow.addColorStop(0, "#e0d09a16");
        glow.addColorStop(0.75, "#99d8d02a");
        glow.addColorStop(1, "#99d8d000");
        ctx.fillStyle = glow;
        ctx.fillRect(w.p.x - 180, w.p.y - 205, 360, 360);
        ctx.strokeStyle = `rgba(164,227,204,${w.magic})`;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(w.p.x, w.p.y, 170 * (1 - w.magic / 0.6), 0, Math.PI * 2);
        ctx.stroke();
      }
      if (!props.current.reducedMotion) {
        const glow = ctx.createRadialGradient(
          w.p.x + 17,
          w.p.y - 11,
          5,
          w.p.x,
          w.p.y,
          95,
        );
        glow.addColorStop(0, "#ffdb791a");
        glow.addColorStop(1, "#ffdb7900");
        ctx.fillStyle = glow;
        ctx.fillRect(w.p.x - 100, w.p.y - 110, 200, 220);
      }
      if (w.tracked) {
        label(
          w.tracked.x,
          w.tracked.y - 65,
          "◆ " + (w.tracked.name || "目的地"),
          "#b8dfc1",
        );
      }
      if (w.target) {
        ctx.strokeStyle = "#e9d7a0";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(w.target.x, w.target.y, 8, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (!props.current.reducedMotion)
        for (let i = 0; i < 22; i++)
          ellipse(
            noise(i, 10) * 1440 + Math.sin(w.time + i) * 15,
            noise(i, 11) * 1000 + Math.cos(w.time * 0.7 + i) * 8,
            1.5,
            1.5,
            "#e1dca17a",
          );
      for (const e of w.effects) {
        ctx.globalAlpha = Math.min(1, e.life * 2);
        ctx.font = "bold 18px sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = e.color;
        ctx.fillText(e.text, e.x, e.y);
        ctx.globalAlpha = 1;
      }
      if (w.comboTime > 0 && w.combo > 1)
        label(
          w.p.x,
          w.p.y - 78,
          `${w.combo} 连击${w.combo === 3 ? " · 破势" : ""}`,
          "#ffe1a0",
        );
      const tints = [
        "#00000000",
        "#58a3b40b",
        "#d4c2960c",
        "#a79cbe12",
        "#99b6bd16",
        "#c7a47612",
        "#a49aca10",
        "#ecd3a51a",
      ];
      ctx.fillStyle = tints[chapter];
      ctx.fillRect(cx, cy, width / scale, height / scale);
      ctx.restore();
      if (w.hurt > 0 && !props.current.reducedMotion) {
        rect(0, 0, width, 4, "#dc8f73");
        rect(0, height - 4, width, 4, "#dc8f73");
      }
      // Mini-map is drawn in screen space.
      const mx = width - 138,
        my = 20;
      rect(mx - 8, my - 8, 126, 98, "#122d29dc");
      ctx.drawImage(assets.village.image, mx, my, 108, 80);
      rect(mx, my, 108, 80, "#12212466");
      chapters[chapter].nodes.forEach((n) => {
        const p = nodePoint(n);
        rect(mx + p.x / 14, my + p.y / 12.5, 3, 3, "#c4b27c");
      });
      caches.forEach((p, i) => {
        if (!s.wilds?.includes(`${chapter}:chest${i}`))
          rect(mx + p.x / 14, my + p.y / 12.5, 4, 4, "#e4c16f");
      });
      w.enemies.forEach((e) => {
        if (e.hp > 0) rect(mx + e.x / 14, my + e.y / 12.5, 3, 3, "#df9b88");
      });
      rect(mx + w.p.x / 14 - 2, my + w.p.y / 12.5 - 2, 5, 5, "#fff2b9");
      ui += dt;
      if (ui > 0.1) {
        ui = 0;
        setHud({
          hp: Math.round(w.hp),
          mp: w.mp,
          near: w.near,
          kills: w.enemies.filter((e) => e.hp <= 0).length,
          message: w.message,
          cooldown: w.cd,
          target: w.enemies.find((e) => e.id === w.locked && e.hp > 0) || null,
        });
      }
    }
    const loop = (t) => {
      const dt = Math.min(0.04, (t - last) / 1000 || 0.016);
      last = t;
      render(dt);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      input.current.clear();
      document.removeEventListener("keydown", key, true);
      document.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [state.chapter]);
  // Campaign battles and inventory can change vitals while the world is paused.
  useEffect(() => {
    if (live.current) {
      live.current.hp = state.hp;
      live.current.mp = state.mp;
    }
  }, [state.hp, state.mp]);
  useEffect(() => {
    if (busy || guide) {
      input.current.clear();
      analog.current = { x: 0, y: 0 };
      setStick({ x: 0, y: 0 });
    }
  }, [busy, guide]);
  const press = (kind) => controls.current?.(kind);
  const progress = wildProgress(state);
  const setJoystick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect(),
      dx = e.clientX - rect.left - rect.width / 2,
      dy = e.clientY - rect.top - rect.height / 2,
      d = Math.hypot(dx, dy),
      radius = 28;
    const x = d ? dx / Math.max(radius, d) : 0,
      y = d ? dy / Math.max(radius, d) : 0;
    analog.current = { x, y };
    setStick({ x: x * radius, y: y * radius });
  };
  const releaseJoystick = () => {
    stickPointer.current = null;
    analog.current = { x: 0, y: 0 };
    setStick({ x: 0, y: 0 });
  };
  return (
    <div
      className={`action-world painted-world ${artStatus !== "ready" ? "art-loading" : ""}`}
    >
      <canvas
        ref={canvas}
        data-art-ready={artStatus === "ready"}
        aria-label="可探索的青溪山野，WASD移动，J挥刀，K灯术，空格闪避，E交互"
        tabIndex={0}
        onPointerDown={(e) => {
          if (busy || artStatus !== "ready") return;
          canvas.current.focus();
          const r = canvas.current.getBoundingClientRect(),
            c = live.current.camera;
          const goal = {
            x: (e.clientX - r.left) / c.scale + c.cx,
            y: (e.clientY - r.top) / c.scale + c.cy,
          };
          controls.current?.({ point: goal });
        }}
      />
      {artStatus !== "ready" && (
        <div className="painted-loader">
          <Flame />
          <b>{artStatus === "error" ? "绘卷未能载入" : "正在展开绘卷"}</b>
          <span>
            {artStatus === "error"
              ? "请检查连接后重试，旅途进度已保留。"
              : "正在准备人物动作与场景素材…"}
          </span>
          {artStatus === "error" && (
            <button
              onClick={() => {
                setArtStatus("loading");
                loadPaintedAssets()
                  .then((a) => {
                    artRef.current = a;
                    setArtStatus("ready");
                  })
                  .catch(() => setArtStatus("error"));
              }}
            >
              重新载入
            </button>
          )}
        </div>
      )}
      {hud.target && (
        <div className="painted-target">
          <Crosshair size={14} />
          <b>{hud.target.name}</b>
          <span>
            {Math.ceil(hud.target.hp)} / {hud.target.maxHp}
          </span>
          <i
            style={{ width: `${(hud.target.hp / hud.target.maxHp) * 100}%` }}
          />
        </div>
      )}
      <div className="wild-heading">
        <span>山野探索 / {chapters[state.chapter].numeral}</span>
        <h2>{chapters[state.chapter].location}</h2>
        <p>
          雾灵 {hud.kills} / 5 · 木箱{" "}
          {
            (state.wilds || []).filter((x) =>
              x.startsWith(`${state.chapter}:chest`),
            ).length
          }{" "}
          / 3
        </p>
      </div>
      <div className="wild-vitals">
        <b>
          沈砚 <small>修灯人</small>
        </b>
        <div>
          <span>
            生命 {hud.hp} / {stats(state).maxHp}
          </span>
          <i style={{ "--fill": `${(hud.hp / stats(state).maxHp) * 100}%` }} />
        </div>
        <div className="spirit">
          <span>灵力 {hud.mp} / 6</span>
          <i style={{ "--fill": `${(hud.mp / 6) * 100}%` }} />
        </div>
      </div>
      <div className="wild-message" role="status" hidden={!!hud.target}>
        {hud.message}
      </div>
      {hud.near && !busy && (
        <button className="wild-interact" onClick={() => press("interact")}>
          <kbd>E</kbd> {hud.near.name}
          <small>
            {hud.near.kind === "camp"
              ? "恢复生命与灵力"
              : hud.near.kind === "chest"
                ? "搜寻补给"
                : "交互 / 调查"}
          </small>
        </button>
      )}
      <div
        className="painted-joystick"
        role="group"
        aria-label="自由方向摇杆"
        onPointerDown={(e) => {
          if (busy) return;
          stickPointer.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          setJoystick(e);
        }}
        onPointerMove={(e) => {
          if (stickPointer.current === e.pointerId) setJoystick(e);
        }}
        onPointerUp={releaseJoystick}
        onPointerCancel={releaseJoystick}
        onLostPointerCapture={releaseJoystick}
      >
        <i style={{ transform: `translate(${stick.x}px,${stick.y}px)` }} />
        <span>移动</span>
      </div>
      <div className="wild-dpad sr-only" aria-label="探索方向">
        {[
          ["w", "↑", "向上"],
          ["a", "←", "向左"],
          ["s", "↓", "向下"],
          ["d", "→", "向右"],
        ].map(([key, label, name]) => (
          <button
            key={key}
            disabled={busy}
            aria-label={name}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              input.current.add(key);
            }}
            onPointerUp={() => input.current.delete(key)}
            onPointerCancel={() => input.current.delete(key)}
            onLostPointerCapture={() => input.current.delete(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="wild-actions">
        {[
          ["attack", "J", "挥刀"],
          [
            "magic",
            "K",
            hud.cooldown > 0 ? `${hud.cooldown.toFixed(1)}s` : "灯术 · 2灵",
          ],
          ["dash", "空格", "闪避"],
          ["heal", "H", `药草 ${state.herbs}`],
        ].map(([id, key, name]) => (
          <button
            key={id}
            disabled={
              busy || (id === "magic" && (hud.mp < 2 || hud.cooldown > 0))
            }
            onPointerDown={(e) => {
              if (id === "attack") {
                e.currentTarget.setPointerCapture(e.pointerId);
                input.current.add("attack");
              }
            }}
            onPointerUp={() => input.current.delete("attack")}
            onPointerCancel={() => input.current.delete("attack")}
            onLostPointerCapture={() => input.current.delete("attack")}
            onClick={() => press(id)}
          >
            {id === "attack" ? (
              <Swords />
            ) : id === "magic" ? (
              <Flame />
            ) : id === "dash" ? (
              <Wind />
            ) : (
              <Heart />
            )}
            <span>{name}</span>
            <kbd>{key}</kbd>
          </button>
        ))}
      </div>
      <div className="wild-objective">
        <span>
          {progress.claimed
            ? "✓ 清雾委托已完成"
            : progress.ready
              ? "清雾完成 · 回营火领奖"
              : "清雾委托"}
        </span>
        <small>
          击退 {progress.kills}/5 · 宝箱 {progress.chests}/3
        </small>
        <div>
          <button disabled={busy} onClick={() => press("hunt")}>
            锁定近敌
          </button>
          <button disabled={busy} onClick={() => press("track")}>
            追踪探索
          </button>
          <button disabled={busy} onClick={() => press("story")}>
            主线指引
          </button>
          <button disabled={busy} onClick={() => press("camp")}>
            返回营火
          </button>
        </div>
      </div>
      <button
        className="wild-guide-toggle"
        onClick={() => setGuide((v) => !v)}
        aria-expanded={guide}
      >
        操作 ?
      </button>
      {guide && (
        <div className="wild-guide">
          <b>先试试走动和挥刀</b>
          <p>
            WASD
            或左下方向键移动。点击地面自动寻路，追踪探索会带你去未开启的宝箱。
          </p>
          <p>
            长按 J
            或挥刀按钮连续出招，自动朝向近敌，第三击可打断蓄力；命中回灵。K
            灯术消耗 2 灵力，空格向朝向闪避。红圈是敌人攻击范围。
          </p>
          <p>
            E 交互，H 恢复生命。清完 5 只雾灵、开启 3 箱，回营火领取委托奖励。
          </p>
          <button onClick={() => setGuide(false)}>开始探索</button>
        </div>
      )}
      <div className="wild-help">
        WASD / 摇杆移动 · 点敌接战 · 点物件交互 · 空格闪避
      </div>
    </div>
  );
}
