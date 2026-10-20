import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { sound } from '../../utils/sound';
import { recordSheepWin, getUserProfile, PROVINCE_SHEEP_RANK } from '../../utils/wechatData';
import confetti from 'canvas-confetti';
import { RotateCcw, Share2, Undo2, ArrowUpFromLine, Shuffle, Trophy, CheckCircle2, HelpCircle } from 'lucide-react';

export interface YangTile {
  id: string;
  type: string;
  emoji: string;
  name: string;
  layer: number;
  x: number; // in pixels
  y: number; // in pixels
  status: 'board' | 'tray' | 'reserve' | 'cleared';
  slotIndex?: number;
}

const TILE_WIDTH = 48;
const TILE_HEIGHT = 54;

const TILE_TYPES = [
  { type: 'carrot', emoji: '🥕', name: '胡萝卜' },
  { type: 'corn', emoji: '🌽', name: '玉米' },
  { type: 'sheep', emoji: '🐑', name: '小羊' },
  { type: 'bell', emoji: '🔔', name: '铜铃' },
  { type: 'milk', emoji: '🥛', name: '牛奶' },
  { type: 'glove', emoji: '🧤', name: '手套' },
  { type: 'wool', emoji: '🧶', name: '毛线' },
  { type: 'wheat', emoji: '🌾', name: '麦穗' },
  { type: 'wood', emoji: '🪵', name: '木桩' },
  { type: 'cabbage', emoji: '🥬', name: '白菜' },
];

interface YangLeGeYangProps {
  onBackToLobby?: () => void;
  onOpenShare?: (score: number, gameName: string) => void;
  onOpenLeaderboard?: () => void;
  onOpenHowToPlay?: () => void;
}

export const YangLeGeYang: React.FC<YangLeGeYangProps> = ({
  onBackToLobby,
  onOpenShare,
  onOpenLeaderboard,
  onOpenHowToPlay,
}) => {
  const [level, setLevel] = useState<number>(1);
  const [tiles, setTiles] = useState<YangTile[]>([]);
  const [tray, setTray] = useState<YangTile[]>([]);
  const [reserve, setReserve] = useState<YangTile[]>([]);
  const [moveHistory, setMoveHistory] = useState<YangTile[]>([]);
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');

  // Props availability counts
  const [undoLeft, setUndoLeft] = useState<number>(1);
  const [moveOutLeft, setMoveOutLeft] = useState<number>(1);
  const [shuffleLeft, setShuffleLeft] = useState<number>(1);
  const [province] = useState<string>(() => getUserProfile().province);

  // Generate tiles for the current level
  const generateLevelTiles = useCallback((lvl: number): YangTile[] => {
    const list: YangTile[] = [];
    let tileId = 0;

    if (lvl === 1) {
      // Level 1: Gentle tutorial - 4 types, 3 of each (12 total tiles, 2 simple layers)
      const chosenTypes = TILE_TYPES.slice(0, 4);
      const allItemTypes: typeof TILE_TYPES[0][] = [];
      chosenTypes.forEach((t) => {
        allItemTypes.push(t, t, t);
      });

      // Shuffle
      allItemTypes.sort(() => Math.random() - 0.5);

      const positions = [
        // Layer 0: 6 tiles
        { x: 40, y: 50, layer: 0 },
        { x: 100, y: 50, layer: 0 },
        { x: 160, y: 50, layer: 0 },
        { x: 40, y: 120, layer: 0 },
        { x: 100, y: 120, layer: 0 },
        { x: 160, y: 120, layer: 0 },
        // Layer 1: 6 tiles overlapping nicely
        { x: 70, y: 85, layer: 1 },
        { x: 130, y: 85, layer: 1 },
        { x: 190, y: 85, layer: 1 },
        { x: 70, y: 155, layer: 1 },
        { x: 130, y: 155, layer: 1 },
        { x: 190, y: 155, layer: 1 },
      ];

      for (let i = 0; i < 12; i++) {
        const item = allItemTypes[i];
        const pos = positions[i];
        list.push({
          id: `t_${tileId++}`,
          type: item.type,
          emoji: item.emoji,
          name: item.name,
          layer: pos.layer,
          x: pos.x + 35,
          y: pos.y + 40,
          status: 'board',
        });
      }
    } else {
      // Level 2: The classic Sheep-a-Sheep challenge
      // 8 types x 6 each = 48 tiles arranged in 4 layers with center pyramid
      const chosenTypes = TILE_TYPES.slice(0, 7);
      const allItemTypes: typeof TILE_TYPES[0][] = [];
      chosenTypes.forEach((t) => {
        // multiple of 3 (6 of each)
        for (let k = 0; k < 6; k++) {
          allItemTypes.push(t);
        }
      });

      allItemTypes.sort(() => Math.random() - 0.5);

      // Layered grid pattern
      const total = allItemTypes.length;
      let count = 0;

      // Bottom deck stacks
      for (let stack = 0; stack < 3; stack++) {
        for (let depth = 0; depth < 4; depth++) {
          if (count >= total) break;
          const item = allItemTypes[count++];
          list.push({
            id: `t_${tileId++}`,
            type: item.type,
            emoji: item.emoji,
            name: item.name,
            layer: depth,
            x: 40 + stack * 85,
            y: 220 + depth * 3,
            status: 'board',
          });
        }
      }

      // Middle multi-layer pyramid
      const centerOffsets = [
        // Layer 0
        { x: 80, y: 60, l: 0 }, { x: 135, y: 60, l: 0 }, { x: 190, y: 60, l: 0 },
        { x: 80, y: 120, l: 0 }, { x: 135, y: 120, l: 0 }, { x: 190, y: 120, l: 0 },
        // Layer 1
        { x: 107, y: 90, l: 1 }, { x: 162, y: 90, l: 1 },
        { x: 107, y: 150, l: 1 }, { x: 162, y: 150, l: 1 },
        // Layer 2
        { x: 135, y: 105, l: 2 }, { x: 135, y: 135, l: 2 },
        // Layer 3
        { x: 135, y: 120, l: 3 },
      ];

      for (let i = 0; i < centerOffsets.length; i++) {
        if (count >= total) break;
        const item = allItemTypes[count++];
        const offset = centerOffsets[i];
        list.push({
          id: `t_${tileId++}`,
          type: item.type,
          emoji: item.emoji,
          name: item.name,
          layer: offset.l + 1,
          x: offset.x,
          y: offset.y,
          status: 'board',
        });
      }

      // Remaining tiles fill surrounding layers
      while (count < total) {
        const item = allItemTypes[count++];
        const rx = 55 + Math.floor(Math.random() * 4) * 45;
        const ry = 70 + Math.floor(Math.random() * 4) * 40;
        const rl = Math.floor(Math.random() * 3);
        list.push({
          id: `t_${tileId++}`,
          type: item.type,
          emoji: item.emoji,
          name: item.name,
          layer: rl,
          x: rx,
          y: ry,
          status: 'board',
        });
      }
    }

    return list;
  }, []);

  const startLevel = useCallback((lvl: number) => {
    setLevel(lvl);
    setTray([]);
    setReserve([]);
    setMoveHistory([]);
    setGameState('playing');
    setTiles(generateLevelTiles(lvl));
  }, [generateLevelTiles]);

  useEffect(() => {
    startLevel(1);
  }, [startLevel]);

  // Check if a tile is blocked by another tile on a higher layer
  const isTileBlocked = useCallback(
    (tile: YangTile): boolean => {
      if (tile.status !== 'board') return false;

      return tiles.some((other) => {
        if (other.id === tile.id || other.status !== 'board') return false;
        if (other.layer <= tile.layer) return false;

        // Bounding box overlap test
        const overlapX = Math.abs(tile.x - other.x) < TILE_WIDTH - 6;
        const overlapY = Math.abs(tile.y - other.y) < TILE_HEIGHT - 6;
        return overlapX && overlapY;
      });
    },
    [tiles]
  );

  // Handle clicking a tile
  const handleTileClick = (tile: YangTile) => {
    if (gameState !== 'playing') return;
    if (tile.status !== 'board' && tile.status !== 'reserve') return;
    if (tile.status === 'board' && isTileBlocked(tile)) return;
    if (tray.length >= 7) return;

    sound.playTileClick();
    sound.triggerHaptic('light');

    // Create a new tray containing the newly clicked tile
    const newTile: YangTile = { ...tile, status: 'tray' };
    const newMoveHistory = [...moveHistory, tile];
    setMoveHistory(newMoveHistory);

    // Update board state
    const newTiles = tiles.map((t) => (t.id === tile.id ? { ...t, status: 'tray' as const } : t));
    setTiles(newTiles);

    // If it was in reserve, remove from reserve
    if (tile.status === 'reserve') {
      setReserve((prev) => prev.filter((t) => t.id !== tile.id));
    }

    // Place into tray with automatic insertion beside identical tiles for smooth UX
    const newTray = [...tray];
    const matchIdx = newTray.findIndex((t) => t.type === newTile.type);
    if (matchIdx !== -1) {
      newTray.splice(matchIdx + 1, 0, newTile);
    } else {
      newTray.push(newTile);
    }

    // Check match 3
    const counts: Record<string, YangTile[]> = {};
    newTray.forEach((t) => {
      counts[t.type] = counts[t.type] || [];
      counts[t.type].push(t);
    });

    let matchedType: string | null = null;
    for (const typeKey in counts) {
      if (counts[typeKey].length >= 3) {
        matchedType = typeKey;
        break;
      }
    }

    if (matchedType) {
      // 3 matched!
      sound.playMatchSuccess();
      sound.triggerHaptic('success');
      const filteredTray = newTray.filter((t) => t.type !== matchedType);
      setTray(filteredTray);

      // Check if all tiles are cleared (Win condition!)
      const remainingBoard = newTiles.filter((t) => t.status === 'board' || t.status === 'reserve');
      if (remainingBoard.length === 0 && filteredTray.length === 0) {
        setGameState('won');
        sound.playVictoryFanfare();
        sound.playBaaSound();
        confetti({ particleCount: 120, spread: 80 });
        if (level === 2) {
          recordSheepWin();
        }
      }
    } else {
      setTray(newTray);
      if (newTray.length >= 7) {
        // Tray is full with no matches -> Lose!
        setGameState('lost');
        sound.playFallSound();
        sound.triggerHaptic('error');
      }
    }
  };

  // Prop 1: Move out 3 tiles into reserve
  const handleMoveOut = () => {
    if (moveOutLeft <= 0 || tray.length === 0 || gameState !== 'playing') return;
    setMoveOutLeft((prev) => prev - 1);
    sound.playButtonClick();
    sound.triggerHaptic('medium');

    const toMove = tray.slice(0, 3);
    const remainingTray = tray.slice(3);

    setTray(remainingTray);
    setReserve((prev) => [...prev, ...toMove.map((t) => ({ ...t, status: 'reserve' as const }))]);
  };

  // Prop 2: Undo last move
  const handleUndo = () => {
    if (undoLeft <= 0 || moveHistory.length === 0 || gameState !== 'playing') return;
    setUndoLeft((prev) => prev - 1);
    sound.playButtonClick();
    sound.triggerHaptic('medium');

    const last = moveHistory[moveHistory.length - 1];
    setMoveHistory((prev) => prev.slice(0, -1));

    // Remove from tray
    setTray((prev) => {
      const idx = prev.findIndex((t) => t.id === last.id);
      if (idx !== -1) {
        const copy = [...prev];
        copy.splice(idx, 1);
        return copy;
      }
      return prev;
    });

    // Restore to board
    setTiles((prev) =>
      prev.map((t) => (t.id === last.id ? { ...t, status: last.status } : t))
    );
  };

  // Prop 3: Shuffle remaining board tiles
  const handleShuffle = () => {
    if (shuffleLeft <= 0 || gameState !== 'playing') return;
    setShuffleLeft((prev) => prev - 1);
    sound.playButtonClick();
    sound.triggerHaptic('medium');

    const boardTiles = tiles.filter((t) => t.status === 'board');
    const shuffledTypes = boardTiles.map((t) => ({
      type: t.type,
      emoji: t.emoji,
      name: t.name,
    }));
    shuffledTypes.sort(() => Math.random() - 0.5);

    setTiles((prev) => {
      let idx = 0;
      return prev.map((t) => {
        if (t.status === 'board') {
          const item = shuffledTypes[idx++];
          return { ...t, ...item };
        }
        return t;
      });
    });
  };

  const remainingTilesCount = useMemo(() => {
    return tiles.filter((t) => t.status === 'board').length;
  }, [tiles]);

  return (
    <div className="relative w-full h-full flex flex-col items-center select-none overflow-hidden bg-gradient-to-b from-[#88c459] via-[#75b448] to-[#599333] text-slate-900">
      {/* Top Pasture Navigation */}
      <div className="w-full px-4 pt-3 pb-2 flex items-center justify-between z-10 text-white drop-shadow">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🐑</span>
          <div>
            <div className="font-extrabold text-base tracking-wide flex items-center gap-1.5">
              羊了个羊
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-700/60 font-semibold border border-white/20">
                第 {level} 关
              </span>
            </div>
            <div className="text-[11px] text-white/80 font-medium">
              代表战队: <span className="text-amber-200 font-bold">{province}</span> (剩余牌: {remainingTilesCount})
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onOpenHowToPlay && (
            <button
              onClick={onOpenHowToPlay}
              className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-full bg-white/20 backdrop-blur hover:bg-white/30 transition text-white font-medium"
              title="玩法说明"
            >
              <HelpCircle className="w-3.5 h-3.5 text-emerald-200" />
              <span>玩法</span>
            </button>
          )}

          {onOpenLeaderboard && (
            <button
              onClick={onOpenLeaderboard}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full bg-white/20 backdrop-blur hover:bg-white/30 transition text-white font-medium"
            >
              <Trophy className="w-3.5 h-3.5 text-yellow-300" />
              省份榜
            </button>
          )}
        </div>
      </div>

      {/* Main Board Tile Stacking Area */}
      <div className="relative flex-1 w-full max-w-[380px] my-auto overflow-hidden">
        {tiles.map((tile) => {
          if (tile.status !== 'board') return null;
          const blocked = isTileBlocked(tile);

          return (
            <button
              key={tile.id}
              onClick={() => handleTileClick(tile)}
              disabled={blocked || gameState !== 'playing'}
              style={{
                left: `${tile.x}px`,
                top: `${tile.y}px`,
                zIndex: tile.layer * 10 + 2,
              }}
              className={`absolute w-[48px] h-[54px] rounded-xl flex flex-col items-center justify-center transition-transform active:scale-90 border-2 select-none ${
                blocked
                  ? 'bg-slate-300 border-slate-400 opacity-60 shadow-inner brightness-75 cursor-not-allowed'
                  : 'bg-white border-amber-900/30 shadow-[0_4px_0_rgba(120,53,15,0.4)] hover:-translate-y-0.5 cursor-pointer'
              }`}
            >
              <span className="text-2xl leading-none">{tile.emoji}</span>
              <span className="text-[9px] font-bold text-slate-700 mt-0.5">{tile.name}</span>
            </button>
          );
        })}

        {/* Temporary Reserve Shelf Area (When Move-Out prop is used) */}
        {reserve.length > 0 && (
          <div className="absolute bottom-2 left-4 right-4 p-2 rounded-2xl bg-black/25 backdrop-blur-sm border border-white/30 flex items-center justify-center gap-2">
            <span className="text-[10px] text-white/70 font-semibold writing-mode-vertical">暂存</span>
            {reserve.map((t) => (
              <button
                key={t.id}
                onClick={() => handleTileClick(t)}
                className="w-[44px] h-[50px] rounded-xl bg-white border-2 border-amber-800/40 shadow flex flex-col items-center justify-center hover:scale-105 active:scale-95 transition"
              >
                <span className="text-xl">{t.emoji}</span>
                <span className="text-[8px] font-bold text-slate-700">{t.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom 7-Slot Tray Container */}
      <div className="w-full max-w-[380px] px-3 pb-2 z-10 flex flex-col items-center">
        <div className="w-full p-2 rounded-2xl bg-[#3d2414]/80 backdrop-blur-md border-2 border-[#5c371f] shadow-2xl flex items-center justify-between gap-1 h-[68px]">
          {Array.from({ length: 7 }).map((_, idx) => {
            const tileInSlot = tray[idx];
            return (
              <div
                key={idx}
                className="flex-1 h-full rounded-xl bg-[#2b170c]/70 border border-[#784628]/60 flex items-center justify-center relative overflow-hidden"
              >
                {tileInSlot ? (
                  <div className="w-full h-full rounded-xl bg-white border-2 border-amber-900/20 shadow-md flex flex-col items-center justify-center animate-scaleIn">
                    <span className="text-2xl leading-none">{tileInSlot.emoji}</span>
                    <span className="text-[8px] font-bold text-slate-700 mt-0.5">{tileInSlot.name}</span>
                  </div>
                ) : (
                  <span className="text-[10px] text-amber-800/30 font-bold">{idx + 1}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Power-up Magic Props Toolbar */}
        <div className="flex items-center justify-around w-full mt-3 px-4">
          {/* Prop 1: Move Out */}
          <button
            onClick={handleMoveOut}
            disabled={moveOutLeft <= 0 || tray.length === 0}
            className={`flex flex-col items-center relative p-2 rounded-2xl transition active:scale-95 ${
              moveOutLeft > 0 && tray.length > 0
                ? 'bg-amber-400 text-amber-950 shadow-[0_4px_0_#b45309] hover:bg-amber-300'
                : 'bg-white/20 text-white/40 cursor-not-allowed'
            }`}
          >
            <ArrowUpFromLine className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-1">移出3张</span>
            <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[9px] font-bold shadow">
              {moveOutLeft}
            </span>
          </button>

          {/* Prop 2: Undo */}
          <button
            onClick={handleUndo}
            disabled={undoLeft <= 0 || moveHistory.length === 0}
            className={`flex flex-col items-center relative p-2 rounded-2xl transition active:scale-95 ${
              undoLeft > 0 && moveHistory.length > 0
                ? 'bg-amber-400 text-amber-950 shadow-[0_4px_0_#b45309] hover:bg-amber-300'
                : 'bg-white/20 text-white/40 cursor-not-allowed'
            }`}
          >
            <Undo2 className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-1">撤销一步</span>
            <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[9px] font-bold shadow">
              {undoLeft}
            </span>
          </button>

          {/* Prop 3: Shuffle */}
          <button
            onClick={handleShuffle}
            disabled={shuffleLeft <= 0}
            className={`flex flex-col items-center relative p-2 rounded-2xl transition active:scale-95 ${
              shuffleLeft > 0
                ? 'bg-amber-400 text-amber-950 shadow-[0_4px_0_#b45309] hover:bg-amber-300'
                : 'bg-white/20 text-white/40 cursor-not-allowed'
            }`}
          >
            <Shuffle className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-1">打乱洗牌</span>
            <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[9px] font-bold shadow">
              {shuffleLeft}
            </span>
          </button>
        </div>
      </div>

      {/* Win Modal */}
      {gameState === 'won' && (
        <div className="absolute inset-0 z-40 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-xs bg-white rounded-3xl p-6 shadow-2xl text-center flex flex-col items-center">
            <span className="text-4xl animate-bounce">🐑🎉</span>
            <h3 className="text-xl font-black text-slate-800 mt-2">
              {level === 1 ? '恭喜通过第1关!' : '太强了！加入羊群成功！'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {level === 1
                ? '热身完毕，即将挑战真正魔鬼级第2关！'
                : `为你所在的【${province}】战队新增了 1 只领头羊！`}
            </p>

            <div className="w-full my-4 py-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              获赠金币 +200，全服排名大幅攀升！
            </div>

            <div className="w-full space-y-2">
              {level === 1 ? (
                <button
                  onClick={() => startLevel(2)}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold text-sm shadow hover:opacity-95 active:scale-98 transition"
                >
                  挑战第2关 (经典高难)
                </button>
              ) : (
                <button
                  onClick={() => onOpenShare?.(1, '羊了个羊')}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm shadow hover:opacity-95 active:scale-98 transition flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  朋友圈炫耀通关记录
                </button>
              )}

              <button
                onClick={() => startLevel(level)}
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm shadow hover:bg-slate-800 active:scale-98 transition flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                重新挑战本关
              </button>

              {onBackToLobby && (
                <button
                  onClick={onBackToLobby}
                  className="w-full py-1.5 text-xs text-slate-400 hover:text-slate-600 font-medium transition"
                >
                  返回大厅
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lost Modal */}
      {gameState === 'lost' && (
        <div className="absolute inset-0 z-40 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-xs bg-white rounded-3xl p-6 shadow-2xl text-center flex flex-col items-center">
            <span className="text-4xl">😵‍💫</span>
            <h3 className="text-xl font-black text-slate-800 mt-2">卡槽已满</h3>
            <p className="text-xs text-slate-500 mt-1">差一点点就消除了，不要气馁！</p>

            <div className="w-full my-4 p-3 bg-amber-50 rounded-2xl border border-amber-200 text-left">
              <div className="text-[11px] font-bold text-amber-900">羊村通关技巧：</div>
              <div className="text-[10px] text-amber-700 mt-1 leading-relaxed">
                • 优先消除层数深、遮挡多的中心塔楼牌<br />
                • 预留至少2个空槽，避免盲目拿单一牌卡死<br />
                • 善用底部的移出与撤销道具扭转局势
              </div>
            </div>

            <div className="w-full space-y-2">
              <button
                onClick={() => {
                  // Simulate reviving by clearing 3 tray tiles
                  if (tray.length > 0) {
                    setTray((prev) => prev.slice(0, 3));
                    setGameState('playing');
                    sound.triggerHaptic('success');
                  } else {
                    startLevel(level);
                  }
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold text-sm shadow hover:opacity-95 active:scale-98 transition"
              >
                移出卡槽继续挑战
              </button>

              <button
                onClick={() => startLevel(level)}
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm shadow hover:bg-slate-800 active:scale-98 transition flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                重新开始本关
              </button>

              {onBackToLobby && (
                <button
                  onClick={onBackToLobby}
                  className="w-full py-1.5 text-xs text-slate-400 hover:text-slate-600 font-medium transition"
                >
                  返回大厅
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
