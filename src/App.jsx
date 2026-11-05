import React, { useState, useEffect, useRef } from "react";
import {
  Flame,
  Compass,
  BookOpen,
  Backpack,
  Save,
  Settings,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  MapPin,
  Check,
  Lock,
  X,
  Volume2,
  VolumeX,
  Moon,
  Sun,
  Swords,
  Shield,
  Sparkles,
  Heart,
  Droplets,
  Coins,
  Scroll,
  Feather,
  Flag,
  Home,
  RotateCcw,
  Download,
  Upload,
  Plus,
  Info,
  Navigation,
  Menu,
  Eye,
  Wind,
} from "lucide-react";
import {
  chapters,
  companions,
  endings,
  gearNames,
  itemNames,
} from "./rpg/content.mjs";
import {
  freshState,
  stats,
  level,
  done,
  requirements,
  resolveNode,
  createBattle,
  battleAction,
  intent,
  intentLabel,
  rest,
  upgrade,
  upgradeCost,
  buy,
  eligibleDawn,
  chooseEnding,
  autonomy,
  validateSave,
  readSave,
  writeSave,
  playtime,
  SAVE_KEY,
} from "./rpg/engine.mjs";
import "./index.css";
import Expedition from "./rpg/Expedition.jsx";
import ActionWorld from "./rpg/ActionWorld.jsx";
import { enterExpedition } from "./rpg/expeditions.mjs";
import { createExpeditionBattle, bossMechanics } from "./rpg/engine.mjs";
const artStyle = (ch) => ({
  "--scene-image": `url("/art/chapter-${ch}.webp")`,
});
const kindLabel = {
  talk: "交谈",
  inspect: "调查",
  puzzle: "机关",
  side: "支线",
  choice: "抉择",
  battle: "遭遇",
  boss: "首领",
  dungeon: "旧路探索",
};
const KindIcon = ({ kind, ...props }) => {
  const Icon =
    {
      talk: Scroll,
      inspect: Eye,
      puzzle: Compass,
      side: Feather,
      choice: Flame,
      battle: Swords,
      boss: Flag,
      dungeon: Compass,
    }[kind] || MapPin;
  return <Icon {...props} />;
};
const Action = ({ icon: Icon, children, ...props }) => (
  <button {...props}>
    {Icon && <Icon size={17} />}
    <span>{children}</span>
  </button>
);
const Meter = ({ value, max, color = "gold", label }) => (
  <div
    className={`meter ${color}`}
    role="meter"
    aria-label={label}
    aria-valuenow={value}
    aria-valuemin={0}
    aria-valuemax={max}
  >
    <i
      style={{ width: `${Math.min(100, Math.max(0, (value / max) * 100))}%` }}
    />
  </div>
);
const Portrait = ({ who = "yan", className = "" }) => (
  <div
    aria-label={companions[who]?.name}
    role="img"
    className={`portrait ${className}`}
    style={{
      "--portrait-x": `${(["yan", "sheng", "ling", "qi"].indexOf(who) * 100) / 3}%`,
    }}
  />
);
const whoFor = (speaker) =>
  speaker.includes("沈砚")
    ? "yan"
    : speaker.includes("闻笙")
      ? "sheng"
      : speaker.includes("阿绫")
        ? "ling"
        : speaker.includes("沈栖")
          ? "qi"
          : null;
function LanternMark({ size = 42 }) {
  return (
    <svg
      width={size}
      height={size * 1.3}
      viewBox="0 0 48 64"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M24 3v9M14 13h20M12 19h24l4 29H8l4-29Z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M16 20l-2 27m10-27v27m8-27 2 27M15 52h18M24 53v8"
        stroke="currentColor"
      />
      <path
        d="M24 25c-9 10-4 18 1 16 6-2 4-9 2-11 0 5-4 4-3-5Z"
        fill="currentColor"
        opacity=".9"
      />
      <circle cx="24" cy="16" r="3" fill="currentColor" />
    </svg>
  );
}
function readSettings() {
  try {
    return {
      ...{ sound: false, reducedMotion: false, textSize: "normal" },
      ...JSON.parse(localStorage.getItem("mist-lantern-settings") || "{}"),
    };
  } catch {
    return { sound: false, reducedMotion: false, textSize: "normal" };
  }
}
export default function App() {
  const [state, setState] = useState(
    () => readSave(localStorage) || freshState(),
  );
  const [screen, setScreen] = useState("title");
  const [worldMode, setWorldMode] = useState(true);
  const [modal, setModal] = useState(null),
    [tab, setTab] = useState("quests");
  const [dialog, setDialog] = useState(null),
    [line, setLine] = useState(0),
    [phase, setPhase] = useState("lines");
  const [puzzle, setPuzzle] = useState([]),
    [puzzleError, setPuzzleError] = useState(false);
  const [battle, setBattle] = useState(null),
    [toast, setToast] = useState(""),
    [transition, setTransition] = useState(false);
  const [settings, setSettings] = useState(readSettings),
    [pending, setPending] = useState(null),
    [slots, setSlots] = useState([]);
  const stateRef = useRef(state),
    battleRef = useRef(battle),
    modalRef = useRef(modal),
    dialogRef = useRef(dialog),
    toastTimer = useRef(),
    fileRef = useRef(),
    focusRef = useRef(),
    audioRef = useRef();
  const ch = chapters[state.chapter],
    st = stats(state),
    finished = done(state, ch.id, "boss");
  const notify = (message) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4200);
  };
  useEffect(() => {
    stateRef.current = state;
    battleRef.current = battle;
    modalRef.current = modal;
    dialogRef.current = dialog;
  }, [state, battle, modal, dialog]);
  useEffect(() => {
    if (!state.started || battle?.status === "active") return;
    try {
      writeSave(localStorage, state);
    } catch {
      notify("自动存档失败，请在行囊中导出存档备份。");
    }
  }, [state, battle?.status]);
  useEffect(() => {
    localStorage.setItem("mist-lantern-settings", JSON.stringify(settings));
    document.documentElement.dataset.motion = settings.reducedMotion
      ? "reduced"
      : "normal";
    document.documentElement.dataset.text = settings.textSize;
  }, [settings]);
  useEffect(() => {
    if (screen !== "game") return;
    const id = setInterval(() => {
      if (!document.hidden && !(modalRef.current === "settings"))
        setState((s) => ({ ...s, seconds: s.seconds + 15 }));
    }, 15000);
    return () => clearInterval(id);
  }, [screen]);
  useEffect(() => {
    if (!settings.sound) return;
    let ctx;
    try {
      ctx = new AudioContext();
      audioRef.current = ctx;
    } catch {
      return;
    }
    const master = ctx.createGain();
    master.gain.value = 0.035;
    master.connect(ctx.destination);
    let step = 0;
    const notes = [146.83, 220, 261.63, 293.66, 329.63, 440, 392, 220];
    const play = () => {
      if (document.hidden) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator(),
        gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = notes[step++ % notes.length];
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.7, t + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 3.5);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t);
      osc.stop(t + 4);
    };
    void ctx.resume();
    play();
    const id = setInterval(play, 2600);
    return () => {
      clearInterval(id);
      void ctx.close();
      audioRef.current = null;
    };
  }, [settings.sound]);
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  useEffect(() => {
    if (modal || dialog || battle) {
      const prev = document.activeElement;
      const id = requestAnimationFrame(() => focusRef.current?.focus());
      return () => {
        cancelAnimationFrame(id);
        prev?.focus?.();
      };
    }
  }, [!!modal, !!dialog, !!battle, battle?.status, phase]);
  const openNode = (n) => {
    if (dialogRef.current || battleRef.current || modalRef.current) return;
    const s = stateRef.current,
      chapter = chapters[s.chapter],
      missing = requirements(s, chapter.id, n);
    if (missing.length) {
      notify(
        `先完成：${missing.map((id) => chapter.nodes.find((n) => n.id === id)?.name).join("、")}`,
      );
      return;
    }
    setState((s) => ({ ...s, position: { x: n.x, y: Math.min(87, n.y + 9) } }));
    if (done(s, chapter.id, n.id) && n.kind === "dungeon") {
      setModal("expedition");
      return;
    }
    if (done(s, chapter.id, n.id)) {
      setDialog({ type: "replay", title: n.name, lines: n.lines, node: n });
    } else setDialog({ type: "node", title: n.name, lines: n.lines, node: n });
    setLine(0);
    setPhase("lines");
    setPuzzle([]);
    setPuzzleError(false);
  };
  useEffect(() => {
    const handler = (e) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      )
        return;
      if (e.key === "Escape") {
        if (modalRef.current) {
          setModal(null);
          setPending(null);
        } else if (!battleRef.current && !dialogRef.current)
          setModal("settings");
        return;
      }
      if (
        screen !== "game" ||
        modalRef.current ||
        dialogRef.current ||
        battleRef.current
      )
        return;
      const v = {
        ArrowUp: [0, -3],
        w: [0, -3],
        ArrowDown: [0, 3],
        s: [0, 3],
        ArrowLeft: [-3, 0],
        a: [-3, 0],
        ArrowRight: [3, 0],
        d: [3, 0],
      }[e.key];
      if (v && !worldMode) {
        e.preventDefault();
        setState((s) => ({
          ...s,
          position: {
            x: Math.min(95, Math.max(5, s.position.x + v[0])),
            y: Math.min(88, Math.max(30, s.position.y + v[1])),
          },
        }));
      }
      if (e.key.toLowerCase() === "e" && !worldMode) {
        e.preventDefault();
        const s = stateRef.current;
        const nearest = [...chapters[s.chapter].nodes].sort(
          (a, b) =>
            Math.hypot(a.x - s.position.x, a.y - s.position.y) -
            Math.hypot(b.x - s.position.x, b.y - s.position.y),
        )[0];
        openNode(nearest);
      }
      if (e.key.toLowerCase() === "j" && !worldMode) setModal("journal");
      if (e.key.toLowerCase() === "m") setModal("map");
      if (e.key.toLowerCase() === "i") setModal("inventory");
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [screen, worldMode]);
  useEffect(() => {
    if (!modal && !battle && !dialog) return;
    const handle = (e) => {
      if (e.key !== "Tab") return;
      const el = document.querySelector('[data-focus-scope="true"]');
      if (!el) return;
      const controls = [
        ...el.querySelectorAll(
          "button:not([disabled]),input:not([disabled]),select:not([disabled]),a[href]",
        ),
      ].filter((e) => e.getClientRects().length);
      if (!controls.length) return;
      if (e.shiftKey && document.activeElement === controls[0]) {
        e.preventDefault();
        controls.at(-1).focus();
      } else if (!e.shiftKey && document.activeElement === controls.at(-1)) {
        e.preventDefault();
        controls[0].focus();
      }
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [modal, battle, dialog]);
  function showModal(id) {
    if (id === "journal") setTab("quests");
    setPending(null);
    if (id === "save") refreshSlots();
    setModal(id);
  }
  function refreshSlots() {
    setSlots(
      [1, 2, 3].map((i) => {
        try {
          const raw = localStorage.getItem(`mist-lantern-slot-${i}`);
          return raw ? validateSave(JSON.parse(raw)) : null;
        } catch {
          return null;
        }
      }),
    );
  }
  function startNew() {
    if (state.started) {
      setPending({ type: "new" });
      showNewConfirm();
      return;
    }
    launchNew();
  }
  function showNewConfirm() {
    setModal("new");
  }
  function launchNew() {
    const next = { ...freshState(), started: true };
    setState(next);
    setBattle(null);
    setScreen("game");
    setModal(null);
    setPending(null);
    setDialog(null);
    setLine(0);
    setPhase("lines");
  }
  function loadState(next) {
    setState({ ...next, hp: Math.max(1, next.hp) });
    setBattle(null);
    setDialog(null);
    setModal(null);
    setPending(null);
    setScreen("game");
    notify("已回到上次亮灯的地方。");
  }
  function saveManual(i) {
    try {
      localStorage.setItem(
        `mist-lantern-slot-${i}`,
        JSON.stringify(validateSave(state)),
      );
      refreshSlots();
      notify(`已保存至手动存档 ${i}。`);
    } catch {
      notify("写入失败，请导出存档。");
    }
  }
  function exportSave() {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
        type: "application/json",
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `雾灯归途-${ch.numeral}-${Date.now()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("存档已导出。");
  }
  async function importSave(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    if (file.size > 256000) {
      notify("存档文件过大。请选择游戏导出的 JSON 文件。");
      return;
    }
    try {
      const next = validateSave(JSON.parse(await file.text()));
      if (!next.started) throw Error("这份存档尚未开始游戏。");
      setPending({ type: "load", state: next });
      setModal("save");
    } catch (e) {
      notify(e instanceof Error ? e.message : "存档读取失败。");
    }
  }
  function finishDialog() {
    if (
      dialog.type === "replay" ||
      ["intro", "camp", "result"].includes(dialog.type)
    ) {
      setDialog(null);
      return;
    }
    const n = dialog.node;
    if (n.kind === "dungeon") {
      setDialog(null);
      setState((s) => enterExpedition(s));
      setModal("expedition");
      return;
    }
    if (n.kind === "choice") {
      setPhase("choice");
      return;
    }
    if (n.kind === "puzzle") {
      setPhase("puzzle");
      return;
    }
    if (["battle", "boss"].includes(n.kind)) {
      setDialog(null);
      setBattle(createBattle(state, ch.id, n.id));
      return;
    }
    setState((s) => resolveNode(s, ch.id, n.id));
    setDialog(null);
    notify(
      n.memory
        ? `获得旧物 · ${n.memory}`
        : n.clue
          ? "线索已记入旅记。"
          : "已完成调查，收获已放入行囊。",
    );
  }
  function selectChoice(i) {
    const n = dialog.node;
    setState((s) => resolveNode(s, ch.id, n.id, i));
    setDialog({
      type: "result",
      title: n.name,
      lines: [{ speaker: "旁白", text: n.choices[i].result }],
    });
    setLine(0);
    setPhase("lines");
  }
  function puzzlePick(i) {
    if (puzzle.includes(i)) return;
    const next = [...puzzle, i];
    setPuzzle(next);
    setPuzzleError(false);
    if (next.length === dialog.node.puzzle.answer.length) {
      if (next.every((v, i) => v === dialog.node.puzzle.answer[i])) {
        const n = dialog.node;
        setState((s) => resolveNode(s, ch.id, n.id));
        setDialog({
          type: "result",
          title: "机关已解",
          lines: [{ speaker: "旁白", text: n.puzzle.success }],
        });
        setPhase("lines");
        setLine(0);
      } else setPuzzleError(true);
    }
  }
  function act(action) {
    const r = battleAction(state, battle, action);
    setState(r.state);
    setBattle(r.battle);
  }
  function closeBattle() {
    const b = battle;
    setBattle(null);
    if (b.expedition) {
      if (b.status === "lost") {
        setState((s) => rest(s));
        notify("已回到回廊入口附近休整，可再次迎战。");
      } else notify("回廊守卫已击退，不会再次刷新。");
      setModal("expedition");
      return;
    }
    if (b.status === "lost") {
      setState((s) => rest(s));
      notify("已返回营地。生命与灵力恢复，已完成剧情保留。");
      return;
    }
    if (b.nodeId === "boss") {
      setDialog({
        type: "camp",
        title: ch.id === 7 ? "天边将明" : "营火边",
        lines: ch.camp,
      });
      setLine(0);
      setPhase("lines");
    } else notify("遭遇结束，奖励已放入行囊。");
  }
  function travel(id) {
    if (id > state.unlocked) {
      notify("沿主线继续探索，即可点亮这段归途。");
      return;
    }
    setModal(null);
    setTransition(true);
    const previous = state.chapter;
    setTimeout(
      () => {
        setState((s) => ({
          ...rest(s),
          chapter: id,
          position: { x: 37, y: 70 },
        }));
        setTransition(false);
        if (id > previous && !done(state, id, "boss")) {
          setDialog({
            type: "intro",
            title: `${chapters[id].numeral} · ${chapters[id].title}`,
            lines: chapters[id].intro,
          });
          setLine(0);
          setPhase("lines");
        }
      },
      settings.reducedMotion ? 0 : 450,
    );
  }
  const nextTask = ch.nodes.find(
    (n) =>
      n.kind !== "side" &&
      !done(state, ch.id, n.id) &&
      !requirements(state, ch.id, n).length,
  );
  const isBusy = !!(dialog || battle || modal);
  const topNav = [
    ["map", Compass, "舆图"],
    ["journal", BookOpen, "旅记"],
    ["inventory", Backpack, "行囊"],
    ["save", Save, "存档"],
    ["settings", Settings, "设置"],
  ];
  const lineData = dialog?.lines[line];
  const modalTitles = {
    map: "山海舆图",
    journal: "行旅手记",
    inventory: "灯与行囊",
    save: "留住此刻",
    settings: "旅途设置",
    new: "再点一盏灯",
    endings: "天亮以后",
    expedition: "灯下旧路",
  };
  return (
    <div className={`app ${screen === "title" ? "is-title" : ""}`}>
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={importSave}
      />
      {screen === "title" ? (
        <main className="title-screen">
          <div className="title-art scene-art" style={artStyle(0)} />
          <div className="title-shade" />
          <div className="title-top">
            <span>
              <i /> 探索 · 战斗 · 角色扮演
            </span>
            <Action
              className="icon-button"
              icon={settings.sound ? Volume2 : VolumeX}
              aria-label="切换声音"
              onClick={() => setSettings((s) => ({ ...s, sound: !s.sound }))}
            >
              声音
            </Action>
          </div>
          <div className="title-content">
            <div className="title-eyebrow">
              <span /> 山河有雾，灯火有归处
            </div>
            <div className="title-logo">
              <h1>
                雾灯
                <br />
                归途
              </h1>
              <span className="seal">
                记得
                <br />
                归来
              </span>
            </div>
            <p className="english-title">M I S T &nbsp; L A N T E R N</p>
            <p className="title-description">
              提一盏旧灯，走进被遗忘的山城。
              <br />
              穿过村落与遗迹，在雾中挥刀、闪避、点灯。
            </p>
            <div className="title-actions">
              <Action
                className="primary"
                icon={Flame}
                onClick={state.started ? () => loadState(state) : startNew}
              >
                {state.started ? "继续旅途" : "点灯启程"}
                <ArrowRight size={17} />
              </Action>
              {state.started && (
                <Action className="secondary" icon={Plus} onClick={startNew}>
                  新的故事
                </Action>
              )}
              <Action
                className="text-button"
                icon={Upload}
                onClick={() => fileRef.current?.click()}
              >
                导入存档
              </Action>
            </div>
            {state.started && (
              <p className="last-save">
                {chapters[state.chapter].numeral} ·{" "}
                {chapters[state.chapter].location}{" "}
                <span>行旅 {playtime(state.seconds)}</span>
              </p>
            )}
          </div>
          <div className="title-story">
            <span>一封未寄出的信</span>
            <p>
              “别急着相信守灯人，
              <br />
              也别急着恨他。”
            </p>
            <i>—— 沈栖</i>
          </div>
          <footer className="title-footer">
            <span>八段归途 · 三种结局 · 一盏未熄的灯</span>
            <button onClick={() => showModal("settings")}>
              游玩设置 <Settings size={14} />
            </button>
            <span>单机体验 / 自动存档</span>
          </footer>
        </main>
      ) : (
        <>
          <header className="game-header">
            <button
              className="brand"
              onClick={() => {
                setModal("settings");
                setPending(null);
              }}
              disabled={!!battle || !!dialog}
              aria-label="雾灯归途菜单"
            >
              <LanternMark size={23} />
              <span>
                雾灯归途<small>MIST LANTERN</small>
              </span>
            </button>
            <div className="header-chapter">
              <span>{ch.numeral}</span>
              <i /> {ch.title}
            </div>
            <nav aria-label="游戏菜单">
              {topNav.map(([id, Icon, label]) => (
                <Action
                  key={id}
                  icon={Icon}
                  aria-label={label}
                  onClick={() => showModal(id)}
                  disabled={!!battle || !!dialog}
                >
                  <span className="nav-label">{label}</span>
                </Action>
              ))}
            </nav>
          </header>
          <div className="game-layout">
            <main className="adventure">
              <section
                className={`scene ${transition ? "traveling" : ""}`}
                aria-label={`${ch.location}探索场景`}
              >
                {worldMode && (
                  <ActionWorld
                    state={state}
                    onChange={setState}
                    onNode={openNode}
                    busy={isBusy || transition || screen !== "game"}
                    reducedMotion={settings.reducedMotion}
                  />
                )}
                <button
                  className="world-mode-switch"
                  disabled={isBusy}
                  onClick={() => setWorldMode((v) => !v)}
                >
                  {worldMode ? "剧情地图" : "实景探索"}
                </button>
                <div className={`legacy-scene ${worldMode ? "hidden" : ""}`}>
                  <div className="scene-art" style={artStyle(ch.id)} />
                  <div className="scene-vignette" />
                  <div
                    className={`weather weather-${ch.id}`}
                    aria-hidden="true"
                  >
                    {Array.from({ length: 15 }, (_, i) => (
                      <i key={i} style={{ "--i": i }} />
                    ))}
                  </div>
                  <div className="scene-heading">
                    <span className="eyebrow">{ch.numeral} / 山海行旅</span>
                    <h1>{ch.location}</h1>
                    <p>{ch.weather}</p>
                  </div>
                  <div className="compass-rose" aria-hidden="true">
                    <span>北</span>
                    <Navigation size={26} />
                    <small>
                      西 <i /> 东
                    </small>
                    <span>南</span>
                  </div>
                  <div className="scene-path" aria-hidden="true">
                    <svg viewBox="0 0 1000 650" preserveAspectRatio="none">
                      <path d="M170 450 Q340 590 420 490 T590 390 Q650 290 740 220 T890 320" />
                    </svg>
                  </div>
                  <div className="hotspots" aria-label="场景交互点">
                    {ch.nodes.map((n) => {
                      const completed = done(state, ch.id, n.id),
                        locked = requirements(state, ch.id, n).length > 0;
                      return (
                        <button
                          key={n.id}
                          className={`hotspot ${completed ? "completed" : ""} ${locked ? "locked" : ""} ${n.kind === "boss" ? "boss-node" : ""} ${nextTask?.id === n.id ? "suggested" : ""}`}
                          style={{ left: `${n.x}%`, top: `${n.y}%` }}
                          onClick={() => openNode(n)}
                          disabled={isBusy || transition}
                          aria-label={`${n.name}，${kindLabel[n.kind]}${completed ? "，已完成" : locked ? "，需前置线索" : ""}`}
                        >
                          <span className="hotspot-icon">
                            {completed ? (
                              <Check size={14} />
                            ) : locked ? (
                              <Lock size={13} />
                            ) : (
                              <KindIcon kind={n.kind} size={16} />
                            )}
                          </span>
                          <span className="hotspot-label">
                            {n.name}
                            <small>
                              {completed ? "已完成" : kindLabel[n.kind]}
                            </small>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div
                    className="traveler"
                    style={{
                      left: `${state.position.x}%`,
                      top: `${state.position.y}%`,
                    }}
                    aria-label="沈砚的位置"
                  >
                    <span className="traveler-shadow" />
                    <img src="/art/traveler.webp" alt="" />
                    <i className="lamp-glow" />
                  </div>
                  <div className="scene-bottom">
                    <span>
                      <MapPin size={13} /> 点击地点探索
                    </span>
                    <span className="desktop-hint">
                      <kbd>W A S D</kbd> 移动 <kbd>E</kbd> 交互
                    </span>
                    <button
                      className="mobile-rest"
                      onClick={() => {
                        setState((s) => rest(s));
                        notify("营火休整完毕，生命与灵力已恢复。");
                      }}
                      disabled={isBusy}
                    >
                      <Flame size={14} /> 营火休整
                    </button>
                    <button onClick={() => showModal("map")} disabled={isBusy}>
                      <Compass size={14} /> 查看舆图
                    </button>
                  </div>
                </div>
                {battle && (
                  <div
                    className="battle-overlay"
                    role="dialog"
                    aria-modal="true"
                    aria-label="回合制战斗"
                    data-focus-scope="true"
                  >
                    <div className="battle-top">
                      <span className="eyebrow">
                        {battle.nodeId === "boss"
                          ? "首领战"
                          : battle.expedition
                            ? "回廊遭遇"
                            : "雾中遭遇"}{" "}
                        · 第 {battle.round + 1} 回合
                      </span>
                      <h2>{battle.enemy.name}</h2>
                      <p>
                        {battle.enemy.boss
                          ? bossMechanics[battle.chapter]
                          : battle.enemy.lore ||
                            "看清敌方意图，在合适的时机出手。"}
                      </p>
                      <Meter
                        value={battle.enemyHp}
                        max={battle.enemy.hp}
                        color="enemy"
                        label="敌方生命"
                      />
                      <div className="enemy-numbers">
                        <span>
                          {battle.enemyHp} / {battle.enemy.hp}
                        </span>
                        <span>
                          弱点 · {battle.enemy.weak}　韧性{" "}
                          {"◆".repeat(battle.poise)}
                          {"◇".repeat(3 - battle.poise)}
                        </span>
                      </div>
                    </div>
                    <div
                      className="enemy-art"
                      style={{
                        "--enemy-x": `${((ch.id % 4) * 100) / 3}%`,
                        "--enemy-y": `${Math.floor(ch.id / 4) * 100}%`,
                      }}
                      role="img"
                      aria-label={battle.enemy.name}
                    />
                    {battle.status === "active" ? (
                      <>
                        <div
                          className={`enemy-intent intent-${intent(battle)}`}
                        >
                          <Eye size={16} />
                          {intentLabel[intent(battle)]}
                          <span>
                            {intent(battle) === "heavy"
                              ? "建议防御 / 破韧打断"
                              : intent(battle) === "charge"
                                ? "下一回合将发动重击"
                                : intent(battle) === "guard"
                                  ? "防御回灵，等待破绽"
                                  : intent(battle) === "expose"
                                    ? "此时造成 165% 伤害"
                                    : "留意自身生命与灵力"}
                          </span>
                        </div>
                        <div className="battle-console">
                          <div
                            className="battle-log"
                            role="log"
                            aria-live="polite"
                          >
                            {battle.log.slice(-3).map((text, i) => (
                              <p key={`${battle.round}-${i}`}>{text}</p>
                            ))}
                          </div>
                          <div className="battle-hero">
                            <strong>
                              沈砚 <small>Lv.{level(state)}</small>
                            </strong>
                            <span>
                              <Heart size={13} /> {battle.heroHp}/{st.maxHp}
                            </span>
                            <span>
                              <Droplets size={13} /> {battle.mp}/6
                            </span>
                            <span className="resonance">
                              共鸣 {"◆".repeat(battle.resonance)}
                              {"◇".repeat(3 - battle.resonance)}
                            </span>
                          </div>
                          <div className="battle-actions">
                            <button
                              ref={focusRef}
                              onClick={() => act("attack")}
                            >
                              <Swords />
                              <strong>短刃</strong>
                              <small>回复 2 灵力</small>
                            </button>
                            <button
                              disabled={battle.mp < 3 || battle.sealed}
                              onClick={() => act("spell")}
                            >
                              <Flame />
                              <strong>引灯术</strong>
                              <small>
                                {battle.sealed ? "封灯中" : "3 灵力 · 削韧"}
                              </small>
                            </button>
                            <button onClick={() => act("guard")}>
                              <Shield />
                              <strong>凝神</strong>
                              <small>减伤 75%</small>
                            </button>
                            <button
                              disabled={battle.resonance < 3}
                              onClick={() => act("burst")}
                              className="burst"
                            >
                              <Sparkles />
                              <strong>破雾</strong>
                              <small>3 共鸣 · 穿透</small>
                            </button>
                            <button
                              disabled={!state.herbs}
                              onClick={() => act("heal")}
                            >
                              <Heart />
                              <strong>回春散</strong>
                              <small>余 {state.herbs} · 恢复 50%</small>
                            </button>
                            <button
                              disabled={!state.oil}
                              onClick={() => act("oil")}
                            >
                              <Droplets />
                              <strong>添灯油</strong>
                              <small>余 {state.oil} · 回满</small>
                            </button>
                            {ch.id >= 1 && (
                              <button
                                disabled={battle.round % 4 !== 0}
                                onClick={() => act("ally")}
                              >
                                <Feather />
                                <strong>{ch.id < 2 ? "归航" : "断丝"}</strong>
                                <small>
                                  {battle.round % 4 === 0
                                    ? "伙伴援助"
                                    : `${4 - (battle.round % 4)} 回合冷却`}
                                </small>
                              </button>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="battle-result">
                        <span>
                          {battle.status === "won"
                            ? "雾散 · 灯明"
                            : "暂歇 · 再行"}
                        </span>
                        <h2>
                          {battle.status === "won"
                            ? "守住了这盏灯"
                            : "归途仍在"}
                        </h2>
                        <p>
                          {battle.status === "won"
                            ? "阅历与物资已收入行囊。"
                            : "回营地恢复状态，已完成剧情和收集不会丢失。"}
                        </p>
                        <Action
                          ref={focusRef}
                          className="primary"
                          icon={battle.status === "won" ? Check : RotateCcw}
                          onClick={closeBattle}
                        >
                          {battle.status === "won" ? "继续旅途" : "返回营地"}
                        </Action>
                      </div>
                    )}
                  </div>
                )}
                {dialog && (
                  <div
                    className="dialog-overlay"
                    role="dialog"
                    aria-modal="true"
                    aria-label={dialog.title}
                    data-focus-scope="true"
                  >
                    {whoFor(lineData?.speaker || "") && (
                      <Portrait
                        className="dialog-portrait"
                        who={whoFor(lineData.speaker)}
                      />
                    )}
                    <div className="dialog-box">
                      <div className="dialog-meta">
                        <span>{dialog.title}</span>
                        <span>
                          {phase === "lines"
                            ? `${line + 1} / ${dialog.lines.length}`
                            : phase === "choice"
                              ? "一个需要你回答的问题"
                              : "观察 · 推理 · 复原"}
                        </span>
                      </div>
                      {phase === "lines" ? (
                        <>
                          <h2>{lineData?.speaker}</h2>
                          <p
                            className="dialog-text"
                            key={`${dialog.title}-${line}`}
                          >
                            {lineData?.text}
                          </p>
                          <div className="dialog-controls">
                            <span>
                              {dialog.type === "replay"
                                ? "回看记忆 · 不重复领取奖励"
                                : "灯火会记得你的选择"}
                            </span>
                            <button
                              ref={focusRef}
                              className="dialog-next"
                              onClick={() =>
                                line < dialog.lines.length - 1
                                  ? setLine((l) => l + 1)
                                  : finishDialog()
                              }
                            >
                              {line < dialog.lines.length - 1
                                ? "继续"
                                : dialog.type === "replay" ||
                                    dialog.type === "result" ||
                                    dialog.type === "intro"
                                  ? "收起"
                                  : dialog.node?.kind === "battle" ||
                                      dialog.node?.kind === "boss"
                                    ? "举灯迎战"
                                    : dialog.node?.kind === "choice"
                                      ? "作出选择"
                                      : dialog.node?.kind === "puzzle"
                                        ? "查看机关"
                                        : "记入旅记"}
                              <ChevronRight size={19} />
                            </button>
                          </div>
                        </>
                      ) : phase === "choice" ? (
                        <>
                          <h2>{dialog.node.name}</h2>
                          <p className="choice-description">
                            有些答案不会立刻显现，但会改变旅途的终点。
                          </p>
                          <div className="choices">
                            {dialog.node.choices.map((c, i) => (
                              <button
                                ref={i === 0 ? focusRef : undefined}
                                key={i}
                                onClick={() => selectChoice(i)}
                              >
                                <span>0{i + 1}</span>
                                {c.text}
                                <ArrowRight size={17} />
                              </button>
                            ))}
                          </div>
                        </>
                      ) : (
                        <>
                          <h2>{dialog.node.puzzle.prompt}</h2>
                          <div className="puzzle-order" aria-live="polite">
                            {[0, 1, 2].map((_, i) => (
                              <span
                                key={i}
                                className={
                                  puzzle[i] !== undefined ? "filled" : ""
                                }
                              >
                                {puzzle[i] !== undefined
                                  ? dialog.node.puzzle.options[puzzle[i]]
                                  : `${i + 1}`}
                              </span>
                            ))}
                          </div>
                          <div className="puzzle-options">
                            {dialog.node.puzzle.options.map((p, i) => (
                              <button
                                ref={i === 0 ? focusRef : undefined}
                                key={i}
                                disabled={puzzle.includes(i) || puzzleError}
                                onClick={() => puzzlePick(i)}
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                          {puzzleError && (
                            <p className="error-text" role="alert">
                              机关没有响应。次序有误，重置后再试。
                            </p>
                          )}
                          <div className="dialog-controls">
                            <button
                              className="text-button"
                              onClick={() => notify(dialog.node.puzzle.hint)}
                            >
                              <Info size={14} /> 回想线索
                            </button>
                            <button
                              onClick={() => {
                                setPuzzle([]);
                                setPuzzleError(false);
                              }}
                              className="text-button"
                            >
                              <RotateCcw size={14} /> 重置顺序
                            </button>
                            <button
                              className="text-button"
                              onClick={() => setDialog(null)}
                            >
                              稍后再来
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </section>
              {finished && (
                <div className="mobile-next-chapter">
                  <span>{ch.location} · 灯已明</span>
                  {ch.id < 7 ? (
                    <Action
                      className="primary"
                      icon={ArrowRight}
                      disabled={isBusy}
                      onClick={() => travel(ch.id + 1)}
                    >
                      前往 {chapters[ch.id + 1].location}
                    </Action>
                  ) : (
                    <Action
                      className="primary"
                      icon={Sun}
                      disabled={isBusy}
                      onClick={() => showModal("endings")}
                    >
                      决定天亮以后的事
                    </Action>
                  )}
                </div>
              )}
              <div className="player-bar">
                <Portrait who="yan" />
                <div className="player-name">
                  <strong>
                    沈砚 <span>Lv.{level(state)}</span>
                  </strong>
                  <small>修灯人 · 提灯而行</small>
                </div>
                <div className="player-health">
                  <div>
                    <span>生命</span>
                    <b>
                      {state.hp}
                      <small> / {st.maxHp}</small>
                    </b>
                  </div>
                  <Meter value={state.hp} max={st.maxHp} label="沈砚生命" />
                  <div className="mana">
                    <span>灵力</span>
                    {Array.from({ length: 6 }, (_, i) => (
                      <i key={i} className={i < state.mp ? "full" : ""} />
                    ))}
                  </div>
                </div>
                <div className="party">
                  <span>同行</span>
                  {ch.id >= 1 ? (
                    <Portrait who="sheng" />
                  ) : (
                    <i className="empty-party">待相逢</i>
                  )}
                  {ch.id >= 2 && <Portrait who="ling" />}
                  {ch.id === 7 && <Portrait who="qi" />}
                </div>
                <div className="supplies">
                  <span>
                    <Droplets size={15} />
                    {state.oil}
                    <small>灯油</small>
                  </span>
                  <span>
                    <Heart size={15} />
                    {state.herbs}
                    <small>药散</small>
                  </span>
                  <span>
                    <Coins size={15} />
                    {state.coins}
                    <small>铜钱</small>
                  </span>
                </div>
              </div>
            </main>
            <aside className="quest-sidebar">
              <div className="sidebar-title">
                <span>
                  <Scroll size={16} /> 当前旅事
                </span>
                <small>{String(ch.id + 1).padStart(2, "0")} / 08</small>
              </div>
              <div className="quest-feature">
                <span className="eyebrow">
                  {finished ? "灯芯已点亮" : "主线 · " + ch.numeral}
                </span>
                <h2>{ch.title}</h2>
                <p>{ch.subtitle}</p>
                <div className="quest-progress">
                  <span>本章探索</span>
                  <b>
                    {ch.nodes.filter((n) => done(state, ch.id, n.id)).length} /{" "}
                    {ch.nodes.length}
                  </b>
                </div>
                <Meter
                  value={
                    ch.nodes.filter((n) => done(state, ch.id, n.id)).length
                  }
                  max={ch.nodes.length}
                  label="本章探索进度"
                />
              </div>
              <div className="quest-list">
                {ch.nodes.map((n) => (
                  <button
                    key={n.id}
                    disabled={isBusy}
                    className={`${done(state, ch.id, n.id) ? "done" : ""} ${nextTask?.id === n.id ? "current" : ""}`}
                    onClick={() => openNode(n)}
                  >
                    <span className="quest-check">
                      {done(state, ch.id, n.id) ? (
                        <Check size={12} />
                      ) : n.kind === "side" ? (
                        <Feather size={12} />
                      ) : (
                        <i />
                      )}
                    </span>
                    <span>
                      {n.name}
                      <small>
                        {done(state, ch.id, n.id)
                          ? "已完成"
                          : n.kind === "side"
                            ? "可选 · 留住一段记忆"
                            : requirements(state, ch.id, n).length
                              ? "尚需线索"
                              : nextTask?.id === n.id
                                ? "当前可探索"
                                : "可前往"}
                      </small>
                    </span>
                    {n.kind === "boss" && <Flag size={13} />}
                  </button>
                ))}
              </div>
              {finished && (
                <div className="next-chapter">
                  {ch.id < 7 ? (
                    <Action
                      className="primary"
                      icon={ArrowRight}
                      disabled={isBusy}
                      onClick={() => travel(ch.id + 1)}
                    >
                      前往 {chapters[ch.id + 1].location}
                    </Action>
                  ) : (
                    <Action
                      className="primary"
                      icon={Sun}
                      disabled={isBusy}
                      onClick={() => showModal("endings")}
                    >
                      决定天亮以后的事
                    </Action>
                  )}
                  <p>还可以回访，完成尚未结束的支线。</p>
                </div>
              )}
              <button
                className="camp-button"
                onClick={() => {
                  setState((s) => rest(s));
                  notify("营火休整完毕，生命与灵力已恢复。");
                }}
                disabled={isBusy}
              >
                <Flame size={17} />
                <span>
                  营火休整<small>恢复生命与灵力</small>
                </span>
                <ChevronRight size={16} />
              </button>
              <div className="sidebar-footer">
                <i />{" "}
                {battle?.status === "active"
                  ? "战斗结束后自动保存"
                  : "旅程自动保存"}
                <span>{playtime(state.seconds)}</span>
              </div>
            </aside>
          </div>
          <footer className="game-footer">
            <span>山河有雾 · 灯火有归处</span>
            <span>
              旧路 {state.routes.length} / 24 <i /> 旧物 {state.memories.length}{" "}
              / 8 <i /> 选择 {Object.keys(state.choices).length} / 8
            </span>
            <span className="desktop-hint">
              <kbd>J</kbd> 旅记 <kbd>M</kbd> 舆图 <kbd>I</kbd> 行囊
            </span>
          </footer>
        </>
      )}
      {modal && (
        <div
          className="modal-shade"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setModal(null);
              setPending(null);
            }
          }}
        >
          <section
            className={`modal modal-${modal}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-heading"
            data-focus-scope="true"
          >
            <header className="modal-header">
              <div>
                <span className="eyebrow">MIST LANTERN / 归途札记</span>
                <h2 id="modal-heading">{modalTitles[modal]}</h2>
              </div>
              <button
                ref={focusRef}
                className="icon-button"
                aria-label="关闭面板"
                onClick={() => {
                  setModal(null);
                  setPending(null);
                }}
              >
                <X size={21} />
              </button>
            </header>
            {modal === "expedition" && (
              <Expedition
                state={state}
                onChange={setState}
                onClose={() => setModal(null)}
                onBattle={(s, event) => {
                  setModal(null);
                  setBattle(createExpeditionBattle(s, event));
                }}
              />
            )}
            {modal === "map" && (
              <>
                <p className="modal-intro">
                  沿灯火走过山河。已抵达的地方，随时可以回去。
                </p>
                <div className="chapter-grid">
                  {chapters.map((c) => (
                    <button
                      key={c.id}
                      disabled={c.id > state.unlocked}
                      onClick={() => travel(c.id)}
                      className={c.id === state.chapter ? "selected" : ""}
                    >
                      <div
                        className="chapter-art scene-art"
                        style={artStyle(c.id)}
                      />
                      <div className="chapter-card-shade" />
                      <span className="chapter-no">{c.numeral}</span>
                      <div>
                        <h3>{c.location}</h3>
                        <p>{c.title}</p>
                      </div>
                      <span className="chapter-status">
                        {c.id > state.unlocked ? (
                          <Lock size={16} />
                        ) : done(state, c.id, "boss") ? (
                          <Check size={16} />
                        ) : c.id === state.chapter ? (
                          <MapPin size={16} />
                        ) : (
                          <ArrowRight size={16} />
                        )}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="map-legend">
                  <span>
                    <Check size={14} /> 已点灯
                  </span>
                  <span>
                    <MapPin size={14} /> 身在此处
                  </span>
                  <span>
                    <Lock size={14} /> 待抵达
                  </span>
                </div>
              </>
            )}
            {modal === "journal" && (
              <>
                <div className="tabs">
                  {[
                    ["quests", "旅事"],
                    ["clues", "线索"],
                    ["memories", "旧物"],
                    ["party", "同行者"],
                  ].map(([id, title]) => (
                    <button
                      key={id}
                      className={tab === id ? "active" : ""}
                      onClick={() => setTab(id)}
                    >
                      {title}
                      {id === "memories" && (
                        <small>{state.memories.length}</small>
                      )}
                    </button>
                  ))}
                </div>
                <div className="journal-content">
                  {tab === "quests" &&
                    chapters
                      .filter((c) => c.id <= state.unlocked)
                      .map((c) => (
                        <div className="journal-chapter" key={c.id}>
                          <h3>
                            {c.numeral} · {c.title}
                            <span>
                              {done(state, c.id, "boss")
                                ? "主线已完成"
                                : "进行中"}
                            </span>
                          </h3>
                          <p>{c.subtitle}</p>
                          <div>
                            {c.nodes.map((n) => (
                              <span
                                key={n.id}
                                className={
                                  done(state, c.id, n.id) ? "checked" : ""
                                }
                              >
                                {done(state, c.id, n.id) ? (
                                  <Check size={12} />
                                ) : (
                                  <i />
                                )}
                                {n.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                  {tab === "clues" &&
                    (state.journal.length ? (
                      state.journal.map((j) => (
                        <article className="journal-entry" key={j.key}>
                          <Scroll size={21} />
                          <div>
                            <small>{chapters[j.chapter].location}</small>
                            <p>{j.text}</p>
                          </div>
                        </article>
                      ))
                    ) : (
                      <Empty
                        icon={Scroll}
                        title="灯纸尚空"
                        text="调查场景与人物，线索会自动记在这里。"
                      />
                    ))}
                  {tab === "memories" &&
                    (state.memories.length ? (
                      state.memories.map((m) => (
                        <article className="memory-entry" key={m.key}>
                          <span>
                            <Feather size={25} />
                          </span>
                          <div>
                            <small>
                              {chapters[m.chapter].location} · 支线旧物
                            </small>
                            <h3>{m.name}</h3>
                            <p>{m.text}</p>
                          </div>
                        </article>
                      ))
                    ) : (
                      <Empty
                        icon={Feather}
                        title="给记忆留一个位置"
                        text="完成可选支线，留住那些曾经被遗忘的人。"
                      />
                    ))}
                  {tab === "party" &&
                    Object.entries(companions).map(([id, c], i) => (
                      <article
                        key={id}
                        className={`party-entry ${state.unlocked < { yan: 0, sheng: 1, ling: 2, qi: 7 }[id] ? "not-met" : ""}`}
                      >
                        <Portrait who={id} />
                        <div>
                          <small>
                            {state.unlocked <
                            { yan: 0, sheng: 1, ling: 2, qi: 7 }[id]
                              ? "尚未相逢"
                              : c.role}
                          </small>
                          <h3>{c.name}</h3>
                          <p>{c.quote}</p>
                          <span>
                            {id === "yan"
                              ? "短刃回灵 · 引灯削韧"
                              : id === "sheng"
                                ? "归航：前期恢复生命并格挡"
                                : id === "ling"
                                  ? "断丝：第二章起伙伴援助削韧"
                                  : "重逢于长明灯塔"}
                          </span>
                        </div>
                      </article>
                    ))}
                </div>
              </>
            )}
            {modal === "inventory" && (
              <>
                <div className="inventory-summary">
                  <Portrait who="yan" />
                  <div>
                    <h3>
                      沈砚 <small>Lv.{level(state)}</small>
                    </h3>
                    <p>
                      阅历 {state.xp} / {Math.min(2200, level(state) * 110)}{" "}
                      <span>行旅 {playtime(state.seconds)}</span>
                    </p>
                  </div>
                  <span>
                    <Coins size={16} /> {state.coins}
                  </span>
                </div>
                <div className="equipment-grid">
                  {Object.entries(gearNames).map(([kind, name]) => (
                    <div className="equipment" key={kind}>
                      {kind === "blade" ? (
                        <Swords />
                      ) : kind === "lantern" ? (
                        <LanternMark size={28} />
                      ) : (
                        <Shield />
                      )}
                      <span className="eyebrow">
                        {kind === "blade"
                          ? "兵刃"
                          : kind === "lantern"
                            ? "灯具"
                            : "衣装"}{" "}
                        · {state.gear[kind]} 阶
                      </span>
                      <h3>{name}</h3>
                      <p>
                        {kind === "blade"
                          ? `普攻 ${st.attack} · 升级 +4`
                          : kind === "lantern"
                            ? `灯术 ${st.magic} · 升级 +6`
                            : `护甲 ${st.armor} · 升级 +2`}
                      </p>
                      <button
                        disabled={
                          state.gear[kind] >= 5 ||
                          state.coins < upgradeCost(state, kind)
                        }
                        onClick={() => {
                          setState((s) => upgrade(s, kind));
                          notify(`${name}已升级。`);
                        }}
                      >
                        {state.gear[kind] >= 5 ? (
                          "已至五阶"
                        ) : (
                          <>
                            <Plus size={13} /> 升级 <Coins size={13} />{" "}
                            {upgradeCost(state, kind)}
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
                <div className="supplies-store">
                  <h3>
                    营地补给 <small>铜钱来自调查、支线与战斗</small>
                  </h3>
                  {[
                    ["herbs", Heart, "恢复 50% 生命", 12],
                    ["oil", Droplets, "回满灵力与共鸣", 18],
                  ].map(([kind, Icon, desc, price]) => (
                    <div className="supply-row" key={kind}>
                      <Icon size={22} />
                      <div>
                        <strong>
                          {itemNames[kind]} <small>持有 {state[kind]}</small>
                        </strong>
                        <p>{desc} · 战斗中使用，占用一回合</p>
                      </div>
                      <button
                        disabled={state.coins < price}
                        onClick={() => setState((s) => buy(s, kind))}
                      >
                        补给 <Coins size={13} /> {price}
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
            {modal === "save" && (
              <>
                {pending?.type === "load" ? (
                  <div className="confirm-box">
                    <Upload size={32} />
                    <h3>回到这段归途？</h3>
                    <p>
                      {chapters[pending.state.chapter].numeral} ·{" "}
                      {chapters[pending.state.chapter].title}
                      <br />
                      Lv.{level(pending.state)} / 行旅{" "}
                      {playtime(pending.state.seconds)}
                    </p>
                    <p>载入会替换当前自动进度；手动存档仍会保留。</p>
                    <div>
                      <Action
                        className="secondary"
                        onClick={() => setPending(null)}
                      >
                        取消
                      </Action>
                      <Action
                        className="primary"
                        onClick={() => loadState(pending.state)}
                      >
                        载入这份存档
                      </Action>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="modal-intro">
                      探索与剧情自动保存；战斗在胜败结算后保存。手动存档可留住不同的选择。
                    </p>
                    <div className="save-slots">
                      {[1, 2, 3].map((i) => (
                        <div className="save-slot" key={i}>
                          <span>0{i}</span>
                          <div>
                            <strong>
                              {slots[i - 1]
                                ? `${chapters[slots[i - 1].chapter].numeral} · ${chapters[slots[i - 1].chapter].location}`
                                : "尚无灯火"}
                            </strong>
                            <p>
                              {slots[i - 1]
                                ? `Lv.${level(slots[i - 1])} · ${playtime(slots[i - 1].seconds)} · 旧物 ${slots[i - 1].memories.length}`
                                : "把此刻的旅程留在这里"}
                            </p>
                          </div>
                          <button
                            disabled={!state.started}
                            onClick={() =>
                              slots[i - 1]
                                ? setPending({ type: "overwrite", slot: i })
                                : saveManual(i)
                            }
                          >
                            保存
                          </button>
                          <button
                            disabled={!slots[i - 1]}
                            onClick={() =>
                              setPending({ type: "load", state: slots[i - 1] })
                            }
                          >
                            载入
                          </button>
                        </div>
                      ))}
                    </div>
                    {pending?.type === "overwrite" && (
                      <div className="inline-confirm">
                        <span>覆盖手动存档 {pending.slot}？</span>
                        <button onClick={() => setPending(null)}>取消</button>
                        <button
                          onClick={() => {
                            saveManual(pending.slot);
                            setPending(null);
                          }}
                        >
                          确认覆盖
                        </button>
                      </div>
                    )}
                    <div className="save-tools">
                      <Action
                        className="secondary"
                        icon={Download}
                        disabled={!state.started}
                        onClick={exportSave}
                      >
                        导出存档
                      </Action>
                      <Action
                        className="secondary"
                        icon={Upload}
                        onClick={() => fileRef.current?.click()}
                      >
                        导入存档
                      </Action>
                    </div>
                    <p className="save-note">
                      存档保存在当前浏览器。清理浏览器数据前，请先导出备份。
                    </p>
                  </>
                )}
              </>
            )}
            {modal === "settings" && (
              <>
                <div className="setting-row">
                  <div>
                    <h3>山间弦音</h3>
                    <p>轻柔的五声音阶氛围音乐</p>
                  </div>
                  <button
                    className={`toggle ${settings.sound ? "on" : ""}`}
                    role="switch"
                    aria-checked={settings.sound}
                    aria-label="山间弦音"
                    onClick={() =>
                      setSettings((s) => ({ ...s, sound: !s.sound }))
                    }
                  >
                    <i />
                  </button>
                </div>
                <div className="setting-row">
                  <div>
                    <h3>减少动态效果</h3>
                    <p>停用飘雪、粒子与转场动画</p>
                  </div>
                  <button
                    className={`toggle ${settings.reducedMotion ? "on" : ""}`}
                    role="switch"
                    aria-checked={settings.reducedMotion}
                    aria-label="减少动态效果"
                    onClick={() =>
                      setSettings((s) => ({
                        ...s,
                        reducedMotion: !s.reducedMotion,
                      }))
                    }
                  >
                    <i />
                  </button>
                </div>
                <div className="setting-row">
                  <div>
                    <h3>文字大小</h3>
                    <p>对白与旅记正文</p>
                  </div>
                  <select
                    value={settings.textSize}
                    aria-label="文字大小"
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, textSize: e.target.value }))
                    }
                  >
                    <option value="normal">标准</option>
                    <option value="large">较大</option>
                  </select>
                </div>
                <div className="guide-box">
                  <h3>
                    <Compass size={17} /> 行旅指南
                  </h3>
                  <p>
                    点击场景地点或右侧旅事推进剧情。机关的答案藏在附近线索里；支线会留下一份独一无二的旧物。
                  </p>
                  <p>
                    战斗中普攻回灵，灯术削韧。敌人蓄力后会重击，可用防御减伤或破韧打断。失利后营地休整，不会丢失剧情。
                  </p>
                  <p>
                    旧路探索：每章三张地图，逐格移动揭开迷雾。踏动符灯会同时改变相邻两盏；按出口灯谱调好三灯并找到铜钥即可通行。
                  </p>
                  <p>
                    键盘：方向键 / WASD 移动，E 交互，J 旅记，M 舆图，I
                    行囊；Tab 切换按钮，Enter 确认。
                  </p>
                </div>
                <div className="settings-bottom">
                  {screen === "game" && (
                    <Action
                      className="secondary"
                      icon={Home}
                      onClick={() => {
                        setScreen("title");
                        setModal(null);
                      }}
                    >
                      返回标题
                    </Action>
                  )}
                  <span>《雾灯归途》 · 本地单机版 v1.0</span>
                </div>
              </>
            )}
            {modal === "new" && (
              <div className="confirm-box">
                <LanternMark />
                <h3>重新走过这段归途？</h3>
                <p>
                  新的故事会替换自动进度。你可以先导出存档，或在存档面板保存到手动栏位。
                </p>
                <div>
                  <Action className="secondary" onClick={() => setModal(null)}>
                    暂不启程
                  </Action>
                  <Action
                    className="secondary"
                    icon={Download}
                    onClick={exportSave}
                  >
                    导出当前进度
                  </Action>
                  <Action className="primary" icon={Flame} onClick={launchNew}>
                    新的故事
                  </Action>
                </div>
              </div>
            )}
            {modal === "endings" && (
              <>
                <p className="modal-intro">
                  没有一条路能替所有人回答。你带来了 {state.memories.length}{" "}
                  份旧物证词，{autonomy(state)} 次选择尊重他人的意愿。
                </p>
                <div className="ending-choices">
                  {[
                    [
                      "dawn",
                      Sun,
                      "将六芯分给自愿举灯的人",
                      "至少四份旧物与四次自主选择",
                    ],
                    [
                      "keeper",
                      Flame,
                      "接过主灯，让姐姐回家",
                      "由沈砚守住长明灯",
                    ],
                    [
                      "road",
                      Wind,
                      "熄灭主灯，带愿意的人远行",
                      "允许每个人选择去留",
                    ],
                  ].map(([id, Icon, text, desc]) => (
                    <button
                      key={id}
                      disabled={id === "dawn" && !eligibleDawn(state)}
                      onClick={() => {
                        setState((s) => chooseEnding(s, id));
                        setModal(null);
                        setScreen("ending");
                      }}
                    >
                      <Icon size={28} />
                      <h3>{endings[id].title}</h3>
                      <p>{text}</p>
                      <small>
                        {id === "dawn" && !eligibleDawn(state)
                          ? "尚未满足 · 可回访支线再来"
                          : desc}
                      </small>
                      <ArrowRight size={17} />
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      )}
      {screen === "ending" && state.ending && (
        <div className="ending-screen">
          <div className="scene-art" style={artStyle(7)} />
          <div className="ending-shade" />
          <div className="ending-text">
            <span className="eyebrow">
              雾灯归途 ·{" "}
              {state.ending === "dawn"
                ? "终得破晓"
                : state.ending === "keeper"
                  ? "此夜长明"
                  : "山外有山"}
            </span>
            <h1>{endings[state.ending].title}</h1>
            <h2>{endings[state.ending].subtitle}</h2>
            {endings[state.ending].text.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            <div className="ending-stats">
              <span>行旅 {playtime(state.seconds)}</span>
              <span>旧物 {state.memories.length} / 8</span>
              <span>旧路 {state.routes.length} / 24</span>
              <span>自主选择 {autonomy(state)} / 8</span>
            </div>
            <div className="ending-actions">
              <Action
                className="primary"
                icon={Compass}
                onClick={() => {
                  setScreen("game");
                  setState((s) => ({ ...s, ending: null }));
                }}
              >
                回到黎明之前
              </Action>
              <Action
                className="secondary"
                icon={Download}
                onClick={exportSave}
              >
                保存这段旅程
              </Action>
              <Action
                className="text-button"
                onClick={() => setScreen("title")}
              >
                返回标题
              </Action>
            </div>
            <small className="credits">
              剧情 / 场景 / 交互程序 · 雾灯归途
              <br />
              场景、人物与敌人插画由 AI 生成 · 感谢你记得他们。
            </small>
          </div>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <Flame size={17} />
          {toast}
        </div>
      )}
    </div>
  );
}
function Empty({ icon: Icon, title, text }) {
  return (
    <div className="empty-state">
      <Icon size={36} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
