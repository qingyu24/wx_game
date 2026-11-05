import React, { useEffect, useRef, useState } from "react";
import { chapters } from "./content.mjs";
import { done, requirements, stats } from "./engine.mjs";
import {
  WORLD,
  camp,
  caches,
  spawns,
  nodePoint,
  moveHero,
  claimWildReward,
  hitEnemies,
  findPath,
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
    controls = useRef(),
    [hud, setHud] = useState({
      hp: state.hp,
      mp: state.mp,
      near: null,
      kills: 0,
      message: "沿石径探索 · 靠近人物按 E 交谈",
      cooldown: 0,
    });
  const props = useRef();
  props.current = { state, onChange, onNode, busy, reducedMotion };
  useEffect(() => {
    const chapter = state.chapter;
    const world = {
      p: { ...camp },
      face: { x: 1, y: 0 },
      enemies: spawns.map((p, i) => ({
        ...p,
        id: `${chapter}:enemy${i}`,
        hp: state.wilds?.includes(`${chapter}:enemy${i}`) ? 0 : 100,
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
      message: "沿石径探索 · 靠近人物按 E 交谈",
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
      }));
    const message = (t) => {
      world.message = t;
    };
    function action(kind) {
      if (props.current.busy || hidden) return;
      if (kind === "attack" && world.attackCd <= 0) {
        world.slash = 0.24;
        world.attackCd = 0.36;
        world.enemies = hitEnemies(world.enemies, world.p, world.face);
      }
      if (kind === "magic" && world.cd <= 0) {
        if (world.mp < 2) {
          message("灵力不足，靠近营火恢复");
          return;
        }
        world.mp -= 2;
        world.magic = 0.6;
        world.cd = 3;
        world.enemies = hitEnemies(world.enemies, world.p, world.face, true);
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
          message("营火休整 · 生命与灵力已恢复");
        } else if (n.kind === "chest") {
          props.current.onChange((s) => claimWildReward(s, n.id));
          message("获得 24 铜钱 · 10 阅历 · 1 药草");
        } else {
          persist();
          props.current.onNode(n);
        }
      }
      if (kind === "heal") {
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
    controls.current = action;
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
    function tree(x, y, s = 1) {
      ellipse(x, y + 4, 24 * s, 10 * s, "#091c2255");
      rect(x - 4 * s, y - 27 * s, 8 * s, 30 * s, "#5f5c44");
      rect(x - 1 * s, y - 32 * s, 2 * s, 31 * s, "#a08b5d");
      if (noise(x, y) > 0.42) {
        for (let i = 0; i < 12; i++) {
          const xx = x + (noise(i, x) - 0.5) * 49 * s,
            yy = y - 48 * s + (noise(i, y) - 0.5) * 38 * s;
          const size = (19 + noise(i, 1) * 12) * s;
          rect(
            xx - size / 2,
            yy - size / 2,
            size,
            size,
            ["#27483b", "#355a43", "#466b4e", "#557b53"][i % 4],
          );
          rect(
            xx - size / 2 + 3 * s,
            yy - size / 2,
            size - 6 * s,
            3 * s,
            "#6a8a5b66",
          );
        }
      } else {
        for (let i = 0; i < 3; i++) {
          const yy = y - 26 * s - i * 18 * s;
          ctx.fillStyle = ["#294c43", "#345c4a", "#47705a"][i];
          ctx.beginPath();
          ctx.moveTo(x, yy - 36 * s);
          ctx.lineTo(x - 29 * s + i * 5, yy + 12 * s);
          ctx.lineTo(x + 29 * s - i * 5, yy + 12 * s);
          ctx.fill();
          for (let j = 0; j < 4; j++)
            rect(
              x - (18 - j * 3) * s,
              yy + (7 - j * 8) * s,
              (7 + (j % 2) * 4) * s,
              3 * s,
              "#79956844",
            );
        }
      }
    }
    function person(x, y, hero = false) {
      const walk = hero && world.walk ? Math.sin(world.time * 16) * 3 : 0;
      ellipse(x, y + 7, 14, 6, "#061d2377");
      rect(x - 8, y - 7, 6, 15 + walk, "#26333b");
      rect(x + 2, y - 7, 6, 15 - walk, "#26333b");
      rect(x - 12, y - 30, 24, 25, hero ? "#93b6ad" : "#a98c67");
      rect(x - 8, y - 47, 16, 19, "#d5b78c");
      rect(x - 10, y - 49, 20, 9, "#243339");
      rect(x - 13, y - 31, 5, 25, hero ? "#dfd2aa" : "#605858");
      rect(x + 13, y - 16, 8, 11, "#f1c67c");
      ellipse(x + 17, y - 11, 17, 17, "#f8c46620");
      rect(x + 15, y - 14, 4, 6, "#fff0ad");
      if (hero) {
        rect(x - 18, y - 12, 3, 26, "#c2c9b2");
        rect(x - 22, y - 13, 11, 3, "#e2c58a");
      }
    }
    function house(x, y) {
      ellipse(x, y + 18, 70, 20, "#102d2855");
      rect(x - 55, y - 62, 110, 78, "#b5ac85");
      rect(x - 48, y - 53, 96, 67, "#7f8b72");
      rect(x - 15, y - 25, 25, 40, "#33443e");
      rect(x - 42, y - 40, 20, 22, "#e4c383");
      rect(x + 25, y - 40, 20, 22, "#e4c383");
      for (let r = 0; r < 6; r++) {
        rect(
          x - 70 + r * 8,
          y - 106 + r * 8,
          140 - r * 16,
          10,
          r % 2 ? "#3f5c59" : "#4b6e67",
        );
      }
      rect(x - 67, y - 62, 134, 6, "#293f3d");
      for (let j = 0; j < 6; j++)
        rect(x - 45 + j * 17, y - 52, 2, 65, "#566e5944");
      rect(x + 8, y - 8, 3, 4, "#dfc787");
      rect(x - 40, y - 39, 2, 20, "#645f46");
      rect(x - 43, y - 30, 20, 2, "#645f46");
      rect(x + 26, y - 30, 18, 2, "#645f46");
      rect(x + 34, y - 39, 2, 20, "#645f46");
      rect(x + 44, y - 101, 15, 28, "#627a68");
      rect(x + 43, y - 105, 18, 5, "#8c9680");
      rect(x - 73, y + 17, 146, 5, "#67775e");
    }
    function render(dt) {
      const { state: s, busy: paused } = props.current;
      const w = world;
      w.time += paused || hidden ? 0 : dt;
      if (!paused && !hidden) {
        for (const k of ["slash", "magic", "dash", "inv", "cd", "attackCd"])
          w[k] = Math.max(0, w[k] - dt);
        const keys = input.current;
        let dx =
            (keys.has("d") || keys.has("arrowright") ? 1 : 0) -
            (keys.has("a") || keys.has("arrowleft") ? 1 : 0),
          dy =
            (keys.has("s") || keys.has("arrowdown") ? 1 : 0) -
            (keys.has("w") || keys.has("arrowup") ? 1 : 0);
        const len = Math.hypot(dx, dy);
        w.walk = !!len;
        if (len) {
          dx /= len;
          dy /= len;
          w.face = { x: dx, y: dy };
          w.target = null;
          w.route = [];
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
        const speed = w.dash > 0 ? 630 : 185;
        w.p = moveHero(w.p, dx * dt * speed, dy * dt * speed);
        w.enemies.forEach((e) => {
          e.flash = Math.max(0, e.flash - dt);
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
              e.wait = 1.3;
              if (d < 78 && w.inv <= 0) {
                w.hp = Math.max(0, w.hp - 15);
                w.inv = 0.6;
                persist();
                message("受到攻击 · 留意红圈，空格闪避");
              }
            }
          } else if (d < 64 && e.wait <= 0) e.wind = 0.8;
          else if (d < 270 && d > 48) {
            const p = moveHero(
              e,
              ((w.p.x - e.x) / d) * 65 * dt,
              ((w.p.y - e.y) / d) * 65 * dt,
            );
            e.x = p.x;
            e.y = p.y;
          }
        });
        if (w.hp <= 0) {
          w.p = { ...camp };
          w.hp = stats(s).maxHp;
          w.mp = 6;
          w.inv = 2;
          w.enemies.forEach((e, i) => {
            Object.assign(e, spawns[i], { wind: 0 });
          });
          persist();
          message("灯火将你带回营地 · 已完成的探索保留");
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
      ctx.imageSmoothingEnabled = false;
      rect(0, 0, width, height, "#192f2c");
      const scale = Math.max(0.65, Math.min(1.1, width / 850));
      const cx = Math.max(
          0,
          Math.min(WORLD.width - width / scale, w.p.x - width / scale / 2),
        ),
        cy = Math.max(
          0,
          Math.min(WORLD.height - height / scale, w.p.y - height / scale / 2),
        );
      w.camera = { cx, cy, scale };
      ctx.save();
      ctx.scale(scale, scale);
      ctx.translate(-cx, -cy);
      for (let y = 0; y < 1000; y += 24)
        for (let x = 0; x < 1440; x += 24) {
          const n = noise(x, y);
          rect(
            x,
            y,
            24,
            24,
            ["#355344", "#385849", "#3c5c49", "#3a5746"][Math.floor(n * 4)],
          );
          if (n > 0.64) {
            rect(x + 4, y + 8, 2, 5, "#68826477");
            rect(x + 8, y + 9, 2, 3, "#68826477");
          }
        }
      for (let i = 0; i < 170; i++) {
        const x = 50 + noise(i, 20) * 1340,
          y = 90 + noise(i, 21) * 840;
        if (x > 610 && x < 745) continue;
        if (i % 4 === 0) {
          ellipse(x, y, 9, 4, "#1d3c3233");
          rect(x - 5, y - 8, 11, 7, "#7d8c76");
          rect(x - 3, y - 10, 7, 3, "#a3ab8a");
        } else if (i % 4 === 1) {
          for (let j = 0; j < 3; j++) {
            rect(x + j * 5, y - (j % 2) * 4, 2, 7, "#819263");
            rect(
              x + j * 5 - 1,
              y - (j % 2) * 4 - 2,
              4,
              3,
              i % 3 ? "#b5b795" : "#d4c17f",
            );
          }
        } else {
          rect(x, y, 2, 8, "#759262");
          rect(x - 3, y + 2, 2, 5, "#759262");
          rect(x + 3, y + 1, 2, 5, "#759262");
        }
      }
      // Winding flagstone roads through the village and across the bridges.
      ctx.strokeStyle = "#858775";
      ctx.lineWidth = 58;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(220, 910);
      ctx.lineTo(430, 700);
      ctx.lineTo(900, 720);
      ctx.lineTo(1120, 500);
      ctx.lineTo(1170, 230);
      ctx.stroke();
      ctx.lineWidth = 38;
      ctx.strokeStyle = "#a3a08a";
      ctx.stroke();
      rect(638, 0, 80, 1000, "#2c6262");
      rect(629, 0, 10, 1000, "#577466");
      rect(718, 0, 11, 1000, "#577466");
      for (let i = 0; i < 65; i++) {
        let yy = (i * 21 + w.time * 13) % 1000;
        rect(650 + noise(i, 3) * 45, yy, 8 + noise(i, 5) * 18, 2, "#80b7a444");
      }
      [304, 722].forEach((y) => {
        rect(619, y - 35, 116, 70, "#655f49");
        for (let x = 620; x < 734; x += 10) rect(x, y - 31, 8, 62, "#b09b73");
        rect(612, y - 40, 130, 6, "#d0bc90");
        rect(612, y + 35, 130, 6, "#d0bc90");
      });
      for (let i = 0; i < 125; i++) {
        const x = 60 + noise(i, 1) * 1320,
          y = 100 + noise(i, 2) * 830;
        if (
          (x > 590 && x < 760) ||
          Math.abs(y - 720) < 95 ||
          chapters[chapter].nodes.some(
            (n) => distance({ x, y }, nodePoint(n)) < 85,
          ) ||
          distance({ x, y }, camp) < 100
        )
          continue;
        tree(x, y, 0.7 + noise(i, 4) * 0.6);
      }
      house(280, 570);
      house(410, 280);
      house(1040, 210);
      // Village fences, stacked firewood and hanging lanterns.
      for (const [fx, fy] of [
        [190, 610],
        [310, 610],
        [335, 330],
        [1095, 250],
      ]) {
        rect(fx, fy - 16, 70, 4, "#a1936c");
        rect(fx, fy - 7, 70, 3, "#8e835e");
        for (let j = 0; j < 5; j++) {
          rect(fx + j * 17, fy - 23, 4, 28, "#b0a27b");
          rect(fx + j * 17, fy - 25, 3, 3, "#d0bc8e");
        }
      }
      for (const [px, py] of [
        [370, 610],
        [440, 355],
        [960, 270],
      ]) {
        rect(px, py - 65, 5, 70, "#5d6247");
        rect(px, py - 65, 28, 4, "#8f8c61");
        rect(px + 22, py - 62, 2, 10, "#bdab79");
        rect(px + 15, py - 51, 17, 21, "#be9658");
        rect(px + 18, py - 49, 11, 17, "#f2cc80");
        rect(px + 15, py - 52, 17, 3, "#635b41");
        rect(px + 15, py - 31, 17, 3, "#635b41");
        ellipse(px + 23, py - 40, 31, 30, "#f4d18a0b");
      }
      for (let j = 0; j < 6; j++) {
        rect(190 + (j % 3) * 10, 590 - Math.floor(j / 3) * 8, 9, 7, "#927c55");
        rect(192 + (j % 3) * 10, 591 - Math.floor(j / 3) * 8, 3, 4, "#b19a6c");
      }

      // Old shrine.
      rect(1095, 440, 140, 76, "#6c7a70");
      for (let i = 0; i < 4; i++)
        rect(1090 + i * 7, 508 + i * 7, 150 - i * 14, 7, "#9b9d81");
      rect(1110, 383, 13, 90, "#a8aa88");
      rect(1210, 383, 13, 90, "#a8aa88");
      rect(1094, 373, 144, 17, "#b5b28e");
      rect(1130, 407, 60, 66, "#365452");
      caches.forEach((p, i) => {
        const open = s.wilds?.includes(`${chapter}:chest${i}`);
        rect(p.x - 16, p.y - 15, 32, 24, open ? "#535e4b" : "#98764a");
        rect(p.x - 18, p.y - 17, 36, 8, open ? "#495644" : "#c2a267");
        if (!open) rect(p.x - 2, p.y - 8, 5, 7, "#f3d88f");
      });
      ellipse(camp.x, camp.y, 23, 10, "#af9567");
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        rect(
          camp.x + Math.cos(a) * 19 - 4,
          camp.y + Math.sin(a) * 8,
          8,
          6,
          "#b9b09a",
        );
      }
      ellipse(camp.x, camp.y - 10, 8, 16 + Math.sin(w.time * 8) * 3, "#e59c4c");
      ellipse(camp.x, camp.y - 8, 4, 10, "#ffdfa0");
      label(camp.x, camp.y - 39, "营火");
      chapters[chapter].nodes.forEach((n) => {
        const p = nodePoint(n),
          complete = done(s, chapter, n.id),
          locked = requirements(s, chapter, n).length > 0;
        if (["talk", "side", "choice"].includes(n.kind)) person(p.x, p.y);
        else {
          rect(
            p.x - 12,
            p.y - 24,
            24,
            30,
            n.kind === "boss" ? "#746386" : "#92987d",
          );
          rect(
            p.x - 6,
            p.y - 20,
            12,
            14,
            complete ? "#6a9983" : locked ? "#5d6b62" : "#e0c17a",
          );
        }
        label(
          p.x,
          p.y - 58,
          `${complete ? "✓ " : locked ? "· " : ""}${n.name}`,
          complete ? "#a2c5b1" : locked ? "#a2aaa0" : "#f0dfb5",
        );
      });
      w.enemies
        .filter((e) => e.hp > 0)
        .sort((a, b) => a.y - b.y)
        .forEach((e) => {
          if (e.wind > 0) {
            ellipse(e.x, e.y, 77, 55, "#e7785540");
            ctx.strokeStyle = "#e9a37c";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(e.x, e.y, 78 * (1 - e.wind / 0.8), 0, Math.PI * 2);
            ctx.stroke();
          }
          ellipse(e.x, e.y + 7, 19, 7, "#142b3166");
          const bob = Math.sin(w.time * 4 + e.x) * 4;
          ctx.save();
          ctx.translate(e.x, e.y + bob);
          ctx.fillStyle = e.flash ? "#fff4c6" : "#7c9990";
          ctx.beginPath();
          ctx.moveTo(0, -43);
          ctx.lineTo(-16, -30);
          ctx.lineTo(-21, -5);
          ctx.lineTo(-29, 7);
          ctx.lineTo(-11, 1);
          ctx.lineTo(-4, 10);
          ctx.lineTo(3, 1);
          ctx.lineTo(16, 7);
          ctx.lineTo(23, 1);
          ctx.lineTo(16, -30);
          ctx.closePath();
          ctx.fill();
          rect(-12, -29, 25, 17, "#263f3e");
          rect(-7, -24, 5, 4, "#edcd86");
          rect(5, -24, 5, 4, "#edcd86");
          rect(-2, -36, 7, 5, "#b2c0a1");
          rect(-15, -7, 6, 9, "#526e63");
          rect(8, -9, 5, 11, "#aec2ac");
          ctx.restore();
          rect(e.x - 19, e.y - 49, 38, 4, "#172b29");
          rect(e.x - 19, e.y - 49, (38 * e.hp) / 100, 4, "#cda17c");
        });
      if (w.inv <= 0 || Math.floor(w.time * 14) % 2) person(w.p.x, w.p.y, true);
      if (w.slash > 0) {
        const a = Math.atan2(w.face.y, w.face.x);
        ctx.strokeStyle = "#ffe4a6";
        ctx.lineWidth = 9;
        ctx.beginPath();
        ctx.arc(w.p.x, w.p.y - 14, 65, a - 1.1, a + 1.1);
        ctx.stroke();
        ctx.strokeStyle = "#fff4d4";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      if (w.magic > 0) {
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
      // Mini-map is drawn in screen space.
      const mx = width - 138,
        my = 20;
      rect(mx - 8, my - 8, 126, 98, "#122d29dc");
      rect(mx + 46, my, 7, 80, "#5e9a94");
      chapters[chapter].nodes.forEach((n) => {
        const p = nodePoint(n);
        rect(mx + p.x / 14, my + p.y / 12.5, 3, 3, "#c4b27c");
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
    if (busy) input.current.clear();
  }, [busy]);
  const press = (kind) => controls.current?.(kind);
  return (
    <div className="action-world">
      <canvas
        ref={canvas}
        aria-label="可探索的青溪山野，WASD移动，J挥刀，K灯术，空格闪避，E交互"
        tabIndex={0}
        onPointerDown={(e) => {
          if (busy) return;
          canvas.current.focus();
          const r = canvas.current.getBoundingClientRect(),
            c = live.current.camera;
          const goal = {
            x: (e.clientX - r.left) / c.scale + c.cx,
            y: (e.clientY - r.top) / c.scale + c.cy,
          };
          live.current.route = findPath(live.current.p, goal);
          live.current.target = live.current.route.shift() || null;
        }}
      />
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
      <div className="wild-message" role="status">
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
      <div className="wild-dpad" aria-label="探索方向">
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
            onClick={() => press(id)}
          >
            <kbd>{key}</kbd>
            <span>{name}</span>
          </button>
        ))}
      </div>
      <div className="wild-help">WASD 移动 · 点击地面行走 · 红圈出现时闪避</div>
    </div>
  );
}
