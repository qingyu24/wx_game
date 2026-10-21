import React, { useEffect, useRef } from "react";
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  KeyRound,
  Flame,
  Swords,
  BookOpen,
  Box,
  DoorOpen,
  Footprints,
  Check,
  Compass,
} from "lucide-react";
import {
  routeDefinition,
  moveExpedition,
  enterExpedition,
} from "./expeditions.mjs";
import { resolveNode } from "./engine.mjs";
const featureLabel = (f) =>
  f?.startsWith("rune")
    ? "符灯"
    : f?.startsWith("battle")
      ? "守卫"
      : f?.startsWith("note")
        ? "旧札"
        : f === "key"
          ? "铜钥"
          : f === "chest"
            ? "补给"
            : f === "exit"
              ? "出口"
              : "";
function FeatureIcon({ feature }) {
  if (feature?.startsWith("rune")) return <Flame />;
  if (feature?.startsWith("battle")) return <Swords />;
  if (feature?.startsWith("note")) return <BookOpen />;
  if (feature === "key") return <KeyRound />;
  if (feature === "chest") return <Box />;
  if (feature === "exit") return <DoorOpen />;
  return null;
}
export default function Expedition({ state, onChange, onBattle, onClose }) {
  const ex = state.expedition,
    ref = useRef();
  const cleared = state.routes.filter((id) =>
    id.startsWith(`${state.chapter}.`),
  ).length;
  useEffect(() => {
    ref.current?.focus();
  }, []);
  function step(dx, dy) {
    if (!ex || state.routes.includes(ex.id)) return;
    const { state: next, event } = moveExpedition(state, dx, dy);
    if (event?.type === "complete") {
      let s = next;
      if (event.floor === 2) s = resolveNode(s, event.chapter, "dungeon");
      onChange(s);
    } else {
      onChange(next);
      if (event?.type === "battle") onBattle(next, event);
    }
  }
  useEffect(() => {
    const key = (e) => {
      if (e.target instanceof HTMLButtonElement && e.key === "Enter") return;
      const v = {
        ArrowUp: [0, -1],
        w: [0, -1],
        ArrowDown: [0, 1],
        s: [0, 1],
        ArrowLeft: [-1, 0],
        a: [-1, 0],
        ArrowRight: [1, 0],
        d: [1, 0],
      }[e.key];
      if (v) {
        e.preventDefault();
        e.stopImmediatePropagation();
        step(...v);
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  });
  if (!ex || ex.chapter !== state.chapter) {
    return (
      <div className="expedition-all-clear">
        <Check size={45} />
        <h3>{cleared === 3 ? "三段旧路，灯火已明" : "走进回廊"}</h3>
        <p>
          {cleared === 3
            ? "所有机关、旧札与补给均有独立记录，奖励不会重复领取。"
            : "此处的脚步与符灯进度会自动保存。"}
        </p>
        <button
          className="primary"
          onClick={() =>
            cleared === 3 ? onClose() : onChange(enterExpedition(state))
          }
        >
          {cleared === 3 ? "回到主图" : "举灯而行"}
        </button>
      </div>
    );
  }
  const def = routeDefinition(ex.chapter, ex.floor),
    complete = state.routes.includes(ex.id),
    hasKey = ex.collected.includes("key");
  return (
    <div className="expedition-content" ref={ref} tabIndex={-1}>
      <div className="expedition-subheading">
        <div>
          <span className="eyebrow">旧路探索 · {ex.floor + 1} / 3</span>
          <h3>{def.title}</h3>
          <p>{def.subtitle}</p>
        </div>
        <div className="route-key">
          <KeyRound size={16} />
          {hasKey ? "已取得铜钥" : "铜钥尚未找到"}
        </div>
      </div>
      <div className="expedition-layout">
        <div
          className="dungeon-board"
          role="grid"
          aria-label={def.title + "，使用方向键或下方按钮移动"}
          style={{ "--map-hue": ex.chapter * 21 }}
        >
          {def.rows.map((row, y) =>
            [...row].map((tile, x) => {
              const feature = def.tiles[`${x},${y}`],
                seen = ex.seen.includes(`${x},${y}`),
                isPlayer = ex.x === x && ex.y === y,
                near = Math.abs(ex.x - x) + Math.abs(ex.y - y) === 1,
                collected = ex.collected.includes(feature),
                rune = feature?.startsWith("rune")
                  ? Number(feature.at(-1))
                  : -1;
              return (
                <button
                  key={`${x},${y}`}
                  role="gridcell"
                  tabIndex={-1}
                  aria-label={
                    isPlayer
                      ? "你的位置"
                      : !seen
                        ? "未探索"
                        : tile === "#"
                          ? "石壁"
                          : featureLabel(feature) || "通路"
                  }
                  disabled={complete || !near || tile === "#"}
                  onClick={() => step(x - ex.x, y - ex.y)}
                  className={`dungeon-cell ${tile === "#" ? "wall" : "floor"} ${!seen ? "unseen" : ""} ${isPlayer ? "player" : ""} ${collected ? "collected" : ""} ${rune >= 0 ? "rune rune-" + rune : ""} ${rune >= 0 && ex.runes[rune] ? "lit" : ""} ${feature === "exit" ? "exit" : ""} ${near && tile !== "#" ? "walkable" : ""}`}
                >
                  {seen &&
                    (isPlayer ? (
                      <Footprints />
                    ) : feature && !collected ? (
                      <FeatureIcon feature={feature} />
                    ) : null)}
                  {seen && rune >= 0 && (
                    <small>{["青", "朱", "金"][rune]}</small>
                  )}
                </button>
              );
            }),
          )}
          <div className="dungeon-grain" aria-hidden="true" />
        </div>
        <aside className="expedition-notes">
          <div className="rune-state">
            <h4>
              <Flame size={14} /> 出口灯谱
            </h4>
            <div>
              {def.target.map((v, i) => (
                <span className={v ? "lit" : ""} key={i}>
                  <i />
                  {["青", "朱", "金"][i]}
                  <small>{v ? "亮" : "暗"}</small>
                </span>
              ))}
            </div>
            <h4>当前符灯</h4>
            <div>
              {ex.runes.map((v, i) => (
                <span className={v ? "lit" : ""} key={i}>
                  <i />
                  {["青", "朱", "金"][i]}
                  <small>{v ? "亮" : "暗"}</small>
                </span>
              ))}
            </div>
            <p>
              踏上符灯会改变它与下一盏灯。三盏状态符合灯谱，并带上铜钥，即可离开。
            </p>
          </div>
          <div className="route-message" role="status">
            <BookOpen size={17} />
            <p>{ex.message}</p>
          </div>
          <div className="dpad" aria-label="方向控制">
            <button
              aria-label="向上移动"
              onClick={() => step(0, -1)}
              disabled={complete}
            >
              <ArrowUp />
            </button>
            <button
              aria-label="向左移动"
              onClick={() => step(-1, 0)}
              disabled={complete}
            >
              <ArrowLeft />
            </button>
            <span>
              <Compass size={20} />
            </span>
            <button
              aria-label="向右移动"
              onClick={() => step(1, 0)}
              disabled={complete}
            >
              <ArrowRight />
            </button>
            <button
              aria-label="向下移动"
              onClick={() => step(0, 1)}
              disabled={complete}
            >
              <ArrowDown />
            </button>
          </div>
        </aside>
      </div>
      <div className="dungeon-legend">
        <span>
          <Footprints />
          自己
        </span>
        <span>
          <Flame />
          符灯
        </span>
        <span>
          <KeyRound />
          铜钥
        </span>
        <span>
          <Swords />
          有限遭遇
        </span>
        <span>
          <BookOpen />
          旧札
        </span>
        <span>
          <Box />
          补给
        </span>
        <span>
          <DoorOpen />
          出口
        </span>
      </div>
      {complete && (
        <div className="route-complete">
          <Check size={18} />
          <span>{def.title} · 已走过</span>
          <button
            className="primary"
            onClick={() =>
              ex.floor === 2
                ? onClose()
                : onChange(enterExpedition({ ...state, expedition: null }))
            }
          >
            {ex.floor === 2 ? "回到主图" : "走进下一段旧路"}
            <ArrowRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
