import React, { useRef, useEffect, useState, useCallback } from 'react';
import { sound } from '../../utils/sound';
import { updateHighScore, getUserProfile } from '../../utils/wechatData';
import confetti from 'canvas-confetti';
import { RotateCcw, Share2, Volume2, VolumeX, Sparkles, Trophy, HelpCircle } from 'lucide-react';

interface FruitDef {
  tier: number;
  name: string;
  emoji: string;
  radius: number;
  color: string;
  points: number;
}

const FRUIT_TIERS: FruitDef[] = [
  { tier: 0, name: '葡萄', emoji: '🍇', radius: 18, color: '#8b5cf6', points: 2 },
  { tier: 1, name: '樱桃', emoji: '🍒', radius: 24, color: '#f43f5e', points: 4 },
  { tier: 2, name: '橘子', emoji: '🍊', radius: 32, color: '#f97316', points: 8 },
  { tier: 3, name: '柠檬', emoji: '🍋', radius: 39, color: '#eab308', points: 16 },
  { tier: 4, name: '猕猴桃', emoji: '🥝', radius: 47, color: '#84cc16', points: 32 },
  { tier: 5, name: '番茄', emoji: '🍅', radius: 55, color: '#ef4444', points: 64 },
  { tier: 6, name: '桃子', emoji: '🍑', radius: 64, color: '#fb7185', points: 128 },
  { tier: 7, name: '菠萝', emoji: '🍍', radius: 74, color: '#facc15', points: 256 },
  { tier: 8, name: '椰子', emoji: '🥥', radius: 85, color: '#78350f', points: 512 },
  { tier: 9, name: '半瓜', emoji: '🍉', radius: 98, color: '#10b981', points: 1024 },
  { tier: 10, name: '大西瓜', emoji: '🍉👑', radius: 114, color: '#059669', points: 2048 },
];

interface FruitBody {
  id: string;
  tier: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isStatic?: boolean;
}

interface JuiceParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  radius: number;
  alpha: number;
}

interface DaXiGuaProps {
  onBackToLobby?: () => void;
  onOpenShare?: (score: number, gameName: string) => void;
  onOpenLeaderboard?: () => void;
  onOpenHowToPlay?: () => void;
}

export const DaXiGua: React.FC<DaXiGuaProps> = ({
  onBackToLobby,
  onOpenShare,
  onOpenLeaderboard,
  onOpenHowToPlay,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => getUserProfile().highScores.watermelon);
  const [currentTier, setCurrentTier] = useState<number>(0);
  const [nextTier, setNextTier] = useState<number>(1);
  const [dropperX, setDropperX] = useState<number>(200);
  const [canDrop, setCanDrop] = useState<boolean>(true);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [dangerWarning, setDangerWarning] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => !sound.getMuted());
  const [watermelonsCreated, setWatermelonsCreated] = useState<number>(0);

  const gameState = useRef<{
    fruits: FruitBody[];
    particles: JuiceParticle[];
    dangerTimer: number;
    animId: number;
    dropperX: number;
    canDrop: boolean;
  }>({
    fruits: [],
    particles: [],
    dangerTimer: 0,
    animId: 0,
    dropperX: 200,
    canDrop: true,
  });

  const getRandomDropTier = () => {
    // Only small initial fruits for dropping (tier 0 to 3)
    const weights = [0.45, 0.3, 0.18, 0.07];
    const r = Math.random();
    let sum = 0;
    for (let i = 0; i < weights.length; i++) {
      sum += weights[i];
      if (r <= sum) return i;
    }
    return 0;
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sound.setMuted(!next);
  };

  const initGame = useCallback(() => {
    gameState.current.fruits = [];
    gameState.current.particles = [];
    gameState.current.dangerTimer = 0;
    gameState.current.canDrop = true;
    gameState.current.dropperX = 200;

    const t1 = getRandomDropTier();
    const t2 = getRandomDropTier();
    setCurrentTier(t1);
    setNextTier(t2);
    setScore(0);
    setGameOver(false);
    setDangerWarning(false);
    setCanDrop(true);
    setDropperX(200);
  }, []);

  useEffect(() => {
    initGame();
  }, [initGame]);

  // Main physics loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();
    const g = gameState.current;

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.04);
      lastTime = now;

      const { width, height } = canvas;
      const g = gameState.current;
      const fruits = g.fruits;
      const dangerLineY = 110;

      // 1. Update Physics
      const gravity = 780;
      const damping = 0.985;
      const bounce = 0.25;

      for (let i = 0; i < fruits.length; i++) {
        const f = fruits[i];
        f.vy += gravity * dt;
        f.vx *= damping;
        f.vy *= damping;

        f.x += f.vx * dt;
        f.y += f.vy * dt;

        // Bottom boundary
        if (f.y + f.radius > height - 10) {
          f.y = height - 10 - f.radius;
          f.vy = -f.vy * bounce;
          f.vx *= 0.85; // Floor friction
        }

        // Left boundary
        if (f.x - f.radius < 10) {
          f.x = 10 + f.radius;
          f.vx = -f.vx * bounce;
        }

        // Right boundary
        if (f.x + f.radius > width - 10) {
          f.x = width - 10 - f.radius;
          f.vx = -f.vx * bounce;
        }
      }

      // 2. Collision & Merge resolution (multiple iterations for stability)
      const toRemove = new Set<string>();
      const toAdd: FruitBody[] = [];

      for (let step = 0; step < 4; step++) {
        for (let i = 0; i < fruits.length; i++) {
          for (let j = i + 1; j < fruits.length; j++) {
            const f1 = fruits[i];
            const f2 = fruits[j];

            if (toRemove.has(f1.id) || toRemove.has(f2.id)) continue;

            const dx = f2.x - f1.x;
            const dy = f2.y - f1.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minDist = f1.radius + f2.radius;

            if (dist < minDist && dist > 0.001) {
              // Collision detected!
              const nx = dx / dist;
              const ny = dy / dist;

              // Check identical tier for MERGE!
              if (f1.tier === f2.tier && f1.tier < FRUIT_TIERS.length - 1 && step === 0) {
                toRemove.add(f1.id);
                toRemove.add(f2.id);

                const nextT = f1.tier + 1;
                const nextDef = FRUIT_TIERS[nextT];
                const mx = (f1.x + f2.x) / 2;
                const my = (f1.y + f2.y) / 2;

                toAdd.push({
                  id: `f_${Date.now()}_${Math.random()}`,
                  tier: nextT,
                  x: mx,
                  y: my,
                  vx: (f1.vx + f2.vx) * 0.4,
                  vy: (f1.vy + f2.vy) * 0.4 - 25,
                  radius: nextDef.radius,
                });

                // Sound & Haptic
                sound.playFruitMerge(nextT);
                sound.triggerHaptic(nextT >= 7 ? 'heavy' : 'light');

                // Award points
                setScore((prev) => {
                  const newScore = prev + nextDef.points;
                  updateHighScore('watermelon', newScore);
                  return newScore;
                });

                // Big Watermelon special celebration!
                if (nextT === 10) {
                  sound.playVictoryFanfare();
                  confetti({ particleCount: 100, spread: 70 });
                  setWatermelonsCreated((c) => c + 1);
                }

                // Splash Particles
                for (let k = 0; k < 12; k++) {
                  const angle = Math.random() * Math.PI * 2;
                  const speed = 40 + Math.random() * 80;
                  g.particles.push({
                    x: mx,
                    y: my,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    color: nextDef.color,
                    radius: 3 + Math.random() * 4,
                    alpha: 1,
                  });
                }
              } else {
                // Regular Elastic Collision Separation
                const overlap = (minDist - dist) * 0.5;
                f1.x -= nx * overlap;
                f1.y -= ny * overlap;
                f2.x += nx * overlap;
                f2.y += ny * overlap;

                // Relative velocity along collision normal
                const kx = f1.vx - f2.vx;
                const ky = f1.vy - f2.vy;
                const p = 2 * (nx * kx + ny * ky) / 2;

                f1.vx -= p * nx * 0.65;
                f1.vy -= p * ny * 0.65;
                f2.vx += p * nx * 0.65;
                f2.vy += p * ny * 0.65;
              }
            }
          }
        }
      }

      // Clean up merged fruits and add new ones
      if (toRemove.size > 0) {
        g.fruits = g.fruits.filter((f) => !toRemove.has(f.id)).concat(toAdd);
      }

      // 3. Danger Line Check (fruits near top)
      let fruitAboveLine = false;
      for (const f of g.fruits) {
        // Only trigger if fruit is settled/slow
        if (f.y - f.radius < dangerLineY && Math.abs(f.vy) < 20) {
          fruitAboveLine = true;
          break;
        }
      }

      if (fruitAboveLine) {
        g.dangerTimer += dt;
        setDangerWarning(true);
        if (g.dangerTimer > 3.5) {
          // Game Over!
          setGameOver(true);
          sound.playFallSound();
          sound.triggerHaptic('error');
        }
      } else {
        g.dangerTimer = Math.max(0, g.dangerTimer - dt * 2);
        setDangerWarning(false);
      }

      // 4. Update particles
      for (let i = g.particles.length - 1; i >= 0; i--) {
        const p = g.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.alpha -= dt * 2;
        if (p.alpha <= 0) {
          g.particles.splice(i, 1);
        }
      }

      // --- 5. RENDER CANVAS ---
      ctx.clearRect(0, 0, width, height);

      // Background
      const bg = ctx.createLinearGradient(0, 0, 0, height);
      bg.addColorStop(0, '#fef9c3');
      bg.addColorStop(1, '#fed7aa');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      // Box borders
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 6;
      ctx.strokeRect(6, 6, width - 12, height - 12);

      // Danger Line
      ctx.save();
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = fruitAboveLine ? '#ef4444' : 'rgba(239, 68, 68, 0.4)';
      ctx.beginPath();
      ctx.moveTo(10, dangerLineY);
      ctx.lineTo(width - 10, dangerLineY);
      ctx.stroke();

      if (fruitAboveLine) {
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`⚠️ 危险警戒线 (${Math.max(0, 3.5 - g.dangerTimer).toFixed(1)}s)`, width - 20, dangerLineY - 6);
      }
      ctx.restore();

      // Render Dropper Aiming Guide
      if (g.canDrop) {
        const currDef = FRUIT_TIERS[currentTier];
        ctx.save();
        ctx.strokeStyle = 'rgba(180, 83, 9, 0.3)';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(g.dropperX, 70);
        ctx.lineTo(g.dropperX, height - 10);
        ctx.stroke();

        // Hanging fruit preview
        ctx.beginPath();
        ctx.arc(g.dropperX, 60, currDef.radius, 0, Math.PI * 2);
        ctx.fillStyle = currDef.color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = `${Math.max(14, currDef.radius * 0.9)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(currDef.emoji, g.dropperX, 60);
        ctx.restore();
      }

      // Render Particles
      g.particles.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Render Fruits
      fruits.forEach((f) => {
        const def = FRUIT_TIERS[f.tier];
        ctx.save();

        // Fruit drop shadow
        ctx.beginPath();
        ctx.arc(f.x + 2, f.y + 3, f.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
        ctx.fill();

        // Fruit body
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(
          f.x - f.radius * 0.3,
          f.y - f.radius * 0.3,
          f.radius * 0.1,
          f.x,
          f.y,
          f.radius
        );
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.2, def.color);
        grad.addColorStop(1, def.color);
        ctx.fillStyle = grad;
        ctx.fill();

        // Border ring
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.stroke();

        // Fruit Emoji Icon
        const emojiSize = Math.max(14, f.radius * 0.9);
        ctx.font = `${emojiSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(def.emoji, f.x, f.y);

        ctx.restore();
      });

      g.animId = requestAnimationFrame(loop);
    };

    g.animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(g.animId);
    };
  }, [currentTier]);

  // Handle dropper movement and drop
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !canDrop || gameOver) return;
    const rect = canvas.getBoundingClientRect();
    const currDef = FRUIT_TIERS[currentTier];
    const clientX = e.clientX - rect.left;
    const scale = canvas.width / rect.width;
    const canvasX = clientX * scale;

    const clampedX = Math.max(currDef.radius + 15, Math.min(canvas.width - currDef.radius - 15, canvasX));
    setDropperX(clampedX);
    gameState.current.dropperX = clampedX;
  };

  const handleDropFruit = () => {
    if (!canDrop || gameOver) return;

    const g = gameState.current;
    const currDef = FRUIT_TIERS[currentTier];

    setCanDrop(false);
    g.canDrop = false;

    // Add falling fruit
    g.fruits.push({
      id: `f_${Date.now()}_${Math.random()}`,
      tier: currentTier,
      x: g.dropperX,
      y: 60,
      vx: (Math.random() - 0.5) * 15,
      vy: 120,
      radius: currDef.radius,
    });

    sound.playFruitDrop();
    sound.triggerHaptic('light');

    // Prepare next fruits
    setTimeout(() => {
      setCurrentTier(nextTier);
      setNextTier(getRandomDropTier());
      setCanDrop(true);
      g.canDrop = true;
    }, 450);
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center select-none overflow-hidden bg-amber-50">
      {/* Top HUD */}
      <div className="w-full px-4 pt-3 pb-2 flex items-center justify-between z-10 bg-amber-100/90 border-b border-amber-200">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xl">🍉</span>
            <span className="text-xl font-extrabold text-amber-950">{score}</span>
            {watermelonsCreated > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500 text-white font-bold animate-pulse">
                已合成 {watermelonsCreated} 个大西瓜!
              </span>
            )}
          </div>
          <div className="text-[11px] text-amber-800 font-medium flex items-center gap-1">
            <Trophy className="w-3 h-3 text-amber-600" />
            最高记录: {Math.max(score, highScore)}
          </div>
        </div>

        {/* Next Fruit Preview & Tools */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white/80 px-2.5 py-1 rounded-xl border border-amber-300 shadow-sm">
            <span className="text-[10px] text-amber-800 font-bold">下一个:</span>
            <span className="text-base">{FRUIT_TIERS[nextTier].emoji}</span>
          </div>

          {onOpenHowToPlay && (
            <button
              onClick={onOpenHowToPlay}
              aria-label="玩法说明"
              className="p-1.5 rounded-lg bg-amber-200 text-amber-900 hover:bg-amber-300 transition"
              title="玩法说明"
            >
              <HelpCircle className="w-4 h-4 text-emerald-800" />
            </button>
          )}

          <button
            onClick={toggleSound}
            aria-label="声音开关"
            className="p-1.5 rounded-lg bg-amber-200 text-amber-900 hover:bg-amber-300 transition"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-red-500" />}
          </button>

          {onOpenLeaderboard && (
            <button
              onClick={onOpenLeaderboard}
              aria-label="排行榜"
              className="p-1.5 rounded-lg bg-amber-200 text-amber-900 hover:bg-amber-300 transition"
            >
              <Trophy className="w-4 h-4 text-amber-700" />
            </button>
          )}
        </div>
      </div>

      {/* Main Game Canvas with Top Dropper Guidance */}
      <div className="relative flex-1 w-full max-w-[400px] flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={380}
          height={600}
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerMove}
          onPointerUp={handleDropFruit}
          className="w-full h-full max-w-[380px] cursor-crosshair touch-none"
        />

        {/* Fruit Evolution Ladder Footer Bar */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-2 py-1.5 bg-amber-200/90 rounded-xl border border-amber-300 text-[11px] font-semibold text-amber-900 backdrop-blur-sm pointer-events-none">
          <span className="text-[10px] text-amber-700 font-bold">进化链:</span>
          {FRUIT_TIERS.map((f, i) => (
            <span key={f.tier} className="text-xs" title={f.name}>
              {f.emoji}
              {i < FRUIT_TIERS.length - 1 && <span className="text-[9px] text-amber-500 mx-0.5">›</span>}
            </span>
          ))}
        </div>
      </div>

      {/* Game Over Screen */}
      {gameOver && (
        <div className="absolute inset-0 z-30 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-fadeIn">
          <div className="w-full max-w-xs bg-white rounded-3xl p-6 shadow-2xl text-center flex flex-col items-center">
            <span className="text-4xl">🍉💥</span>
            <h3 className="text-xl font-bold text-slate-800 mt-2">水果溢出</h3>
            <div className="my-3 py-3 px-6 bg-amber-50 rounded-2xl w-full border border-amber-200">
              <div className="text-xs text-amber-700 font-medium">最终得分</div>
              <div className="text-4xl font-black text-amber-950 mt-1">{score}</div>
              <div className="text-xs text-amber-600 mt-1">
                最高记录: {Math.max(score, highScore)}
              </div>
            </div>

            <div className="w-full space-y-2">
              <button
                onClick={() => {
                  // Revive by blowing up top fruits
                  const g = gameState.current;
                  g.fruits = g.fruits.filter((f) => f.y > 280);
                  g.dangerTimer = 0;
                  setGameOver(false);
                  sound.playMatchSuccess();
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold text-sm shadow hover:opacity-95 active:scale-98 transition flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-200" />
                炸除顶部水果复活
              </button>

              <button
                onClick={initGame}
                className="w-full py-2.5 rounded-xl bg-amber-500 text-amber-950 font-bold text-sm shadow hover:bg-amber-400 active:scale-98 transition flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                重新来一盘
              </button>

              <button
                onClick={() => onOpenShare?.(score, '合成大西瓜')}
                className="w-full py-2.5 rounded-xl bg-amber-50 text-amber-900 font-bold text-sm hover:bg-amber-100 active:scale-98 transition flex items-center justify-center gap-2 border border-amber-200"
              >
                <Share2 className="w-4 h-4" />
                生成战绩海报
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
