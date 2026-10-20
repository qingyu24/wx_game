import React, { useEffect, useRef, useState, useCallback } from 'react';
import { sound } from '../../utils/sound';
import { updateHighScore, getUserProfile } from '../../utils/wechatData';
import confetti from 'canvas-confetti';
import { RotateCcw, Share2, Volume2, VolumeX, Sparkles, Trophy, HelpCircle } from 'lucide-react';

interface Platform {
  x: number;
  y: number;
  z: number;
  type: 'cylinder' | 'cube' | 'music' | 'express' | 'store' | 'rubik';
  color: string;
  topColor: string;
  sideColor: string;
  width: number;
  height: number;
  bonusChecked?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  size: number;
}

interface TiaoYiTiaoProps {
  onBackToLobby?: () => void;
  onOpenShare?: (score: number, gameName: string) => void;
  onOpenLeaderboard?: () => void;
  onOpenHowToPlay?: () => void;
}

export const TiaoYiTiao: React.FC<TiaoYiTiaoProps> = ({
  onBackToLobby,
  onOpenShare,
  onOpenLeaderboard,
  onOpenHowToPlay,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [comboText, setComboText] = useState<{ text: string; points: number } | null>(null);
  const [bonusText, setBonusText] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [highScore, setHighScore] = useState<number>(() => getUserProfile().highScores.jump);
  const [isCharging, setIsCharging] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => !sound.getMuted());
  const [revived, setRevived] = useState<boolean>(false);

  // Game internal state ref
  const gameState = useRef<{
    platforms: Platform[];
    currentIndex: number;
    player: {
      x: number;
      y: number;
      z: number;
      scaleY: number;
      scaleX: number;
      rotation: number;
      state: 'idle' | 'charging' | 'jumping' | 'falling';
    };
    chargeStartTime: number;
    jumpStart: { x: number; y: number; z: number };
    jumpEnd: { x: number; y: number; z: number };
    jumpProgress: number;
    jumpDuration: number;
    camera: { x: number; y: number };
    targetCamera: { x: number; y: number };
    particles: Particle[];
    idleStayTimer: number | null;
    currentBoxStayTime: number;
    animationFrameId: number;
    score: number;
    combo: number;
  }>({
    platforms: [],
    currentIndex: 0,
    player: {
      x: 0,
      y: 0,
      z: 0,
      scaleY: 1,
      scaleX: 1,
      rotation: 0,
      state: 'idle',
    },
    chargeStartTime: 0,
    jumpStart: { x: 0, y: 0, z: 0 },
    jumpEnd: { x: 0, y: 0, z: 0 },
    jumpProgress: 0,
    jumpDuration: 400,
    camera: { x: 0, y: 0 },
    targetCamera: { x: 0, y: 0 },
    particles: [],
    idleStayTimer: null,
    currentBoxStayTime: 0,
    animationFrameId: 0,
    score: 0,
    combo: 0,
  });

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sound.setMuted(!next);
  };

  // Convert 3D world coord to 2D isometric screen coord
  const worldToScreen = useCallback((x: number, y: number, z: number, cameraX: number, cameraY: number, width: number, height: number) => {
    // 2.5D Isometric projection: 30-degree tilt
    const cos30 = 0.866;
    const sin30 = 0.5;
    const relX = x - cameraX;
    const relY = y - cameraY;

    const screenX = width / 2 + (relX - relY) * cos30;
    const screenY = height / 2 + 100 + (relX + relY) * sin30 - z;
    return { x: screenX, y: screenY };
  }, []);

  const generatePlatform = (prevPlatform: Platform, index: number): Platform => {
    // Alternating random direction: either right (+X) or left (+Y)
    const direction = Math.random() > 0.5 ? 'right' : 'left';
    const distance = 110 + Math.random() * 90; // distance between platforms

    const newX = direction === 'right' ? prevPlatform.x + distance : prevPlatform.x;
    const newY = direction === 'left' ? prevPlatform.y + distance : prevPlatform.y;

    // Platform themes
    const types: Platform['type'][] = ['cylinder', 'cube', 'rubik', 'music', 'express', 'store'];
    // Give special boxes every few jumps
    let chosenType: Platform['type'] = 'cylinder';
    if (index === 0) {
      chosenType = 'cylinder';
    } else if (index % 5 === 0) {
      chosenType = 'music';
    } else if (index % 7 === 0) {
      chosenType = 'store';
    } else if (index % 4 === 0) {
      chosenType = 'express';
    } else if (index % 3 === 0) {
      chosenType = 'rubik';
    } else {
      chosenType = Math.random() > 0.4 ? 'cylinder' : 'cube';
    }

    const colorPalettes = [
      { top: '#e2e8f0', side: '#94a3b8', color: '#64748b' },
      { top: '#fed7aa', side: '#f97316', color: '#ea580c' },
      { top: '#bbf7d0', side: '#22c55e', color: '#16a34a' },
      { top: '#bae6fd', side: '#0284c7', color: '#0369a1' },
      { top: '#fbcfe8', side: '#ec4899', color: '#db2777' },
      { top: '#e9d5ff', side: '#a855f7', color: '#9333ea' },
    ];
    const palette = colorPalettes[index % colorPalettes.length];

    return {
      x: newX,
      y: newY,
      z: 0,
      type: chosenType,
      color: palette.color,
      topColor: palette.top,
      sideColor: palette.side,
      width: 70 + Math.random() * 15,
      height: 48,
      bonusChecked: false,
    };
  };

  const initGame = useCallback(() => {
    const p1: Platform = {
      x: 0,
      y: 0,
      z: 0,
      type: 'cylinder',
      color: '#475569',
      topColor: '#cbd5e1',
      sideColor: '#64748b',
      width: 80,
      height: 48,
      bonusChecked: true,
    };
    const p2 = generatePlatform(p1, 1);
    const p3 = generatePlatform(p2, 2);

    gameState.current = {
      platforms: [p1, p2, p3],
      currentIndex: 0,
      player: {
        x: p1.x,
        y: p1.y,
        z: p1.height,
        scaleY: 1,
        scaleX: 1,
        rotation: 0,
        state: 'idle',
      },
      chargeStartTime: 0,
      jumpStart: { x: 0, y: 0, z: 0 },
      jumpEnd: { x: 0, y: 0, z: 0 },
      jumpProgress: 0,
      jumpDuration: 420,
      camera: { x: 0, y: 0 },
      targetCamera: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 },
      particles: [],
      idleStayTimer: null,
      currentBoxStayTime: 0,
      animationFrameId: 0,
      score: 0,
      combo: 0,
    };

    setScore(0);
    setCombo(0);
    setComboText(null);
    setBonusText(null);
    setGameOver(false);
    setRevived(false);
  }, []);

  useEffect(() => {
    initGame();
  }, [initGame]);

  // Main game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();
    const g = gameState.current;

    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      const g = gameState.current;
      const { player, platforms, currentIndex } = g;
      const currentPlat = platforms[currentIndex];
      const nextPlat = platforms[currentIndex + 1];

      // Update camera smooth follow
      g.camera.x += (g.targetCamera.x - g.camera.x) * 4 * dt;
      g.camera.y += (g.targetCamera.y - g.camera.y) * 4 * dt;

      // Handle Charging
      if (player.state === 'charging') {
        const elapsed = (time - g.chargeStartTime) / 1000;
        const maxChargeTime = 1.4;
        const progress = Math.min(elapsed / maxChargeTime, 1);

        // Compression animation
        player.scaleY = 1 - progress * 0.42;
        player.scaleX = 1 + progress * 0.25;

        // Particle charging dust
        if (Math.random() < 0.4) {
          const angle = Math.random() * Math.PI * 2;
          const dist = 15 + Math.random() * 20;
          g.particles.push({
            x: player.x + Math.cos(angle) * dist,
            y: player.y + Math.sin(angle) * dist,
            vx: -Math.cos(angle) * 30,
            vy: -Math.sin(angle) * 30,
            color: '#38bdf8',
            alpha: 0.8,
            size: 2 + Math.random() * 2,
          });
        }
      }

      // Handle Idle Easter Egg Stay Bonus (Music box, Store, Express)
      if (player.state === 'idle' && currentPlat && !currentPlat.bonusChecked) {
        g.currentBoxStayTime += dt;
        if (g.currentBoxStayTime > 1.8) {
          currentPlat.bonusChecked = true;
          let bonusPts = 0;
          let bonusName = '';
          if (currentPlat.type === 'music') {
            bonusPts = 15;
            bonusName = '🎵 唱片机播放音乐 +15';
            sound.playEasterEggSound();
          } else if (currentPlat.type === 'store') {
            bonusPts = 15;
            bonusName = '🏪 便利店营业中 +15';
            sound.playEasterEggSound();
          } else if (currentPlat.type === 'express') {
            bonusPts = 10;
            bonusName = '📦 快递拆箱惊喜 +10';
            sound.playEasterEggSound();
          } else if (currentPlat.type === 'rubik') {
            bonusPts = 10;
            bonusName = '🎲 魔方复原奖励 +10';
            sound.playEasterEggSound();
          }

          if (bonusPts > 0) {
            sound.triggerHaptic('success');
            g.score += bonusPts;
            setScore(g.score);
            setBonusText(bonusName);
            setTimeout(() => setBonusText(null), 2000);
          }
        }
      }

      // Handle Jumping
      if (player.state === 'jumping') {
        g.jumpProgress += (dt * 1000) / g.jumpDuration;

        if (g.jumpProgress >= 1) {
          // Landing
          g.jumpProgress = 1;
          player.x = g.jumpEnd.x;
          player.y = g.jumpEnd.y;
          player.z = g.jumpEnd.z;
          player.scaleY = 1;
          player.scaleX = 1;
          player.rotation = 0;

          // Check landing on nextPlat
          if (!nextPlat) return;
          const dx = player.x - nextPlat.x;
          const dy = player.y - nextPlat.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const platformRadius = nextPlat.width / 2;

          if (dist <= platformRadius + 4) {
            // Success Land!
            const isCenter = dist <= 14;
            let addedScore = 1;

            if (isCenter) {
              g.combo += 1;
              addedScore = g.combo * 2;
              setCombo(g.combo);
              setComboText({ text: `🎯 靶心加倍!`, points: addedScore });
              sound.playLandSound(true, g.combo);
              sound.triggerHaptic('success');
            } else {
              g.combo = 0;
              setCombo(0);
              setComboText(null);
              sound.playLandSound(false, 0);
              sound.triggerHaptic('medium');
            }

            g.score += addedScore;
            setScore(g.score);

            // Emit landing dust particles
            for (let i = 0; i < 12; i++) {
              const ang = (Math.PI * 2 * i) / 12;
              g.particles.push({
                x: player.x,
                y: player.y,
                vx: Math.cos(ang) * 45,
                vy: Math.sin(ang) * 45,
                color: isCenter ? '#f59e0b' : '#94a3b8',
                alpha: 1,
                size: 3,
              });
            }

            player.state = 'idle';
            g.currentIndex += 1;
            g.currentBoxStayTime = 0;

            // Generate subsequent platform
            const futurePlat = generatePlatform(nextPlat, g.currentIndex + 1);
            platforms.push(futurePlat);

            // Update camera target
            g.targetCamera = {
              x: (nextPlat.x + futurePlat.x) / 2,
              y: (nextPlat.y + futurePlat.y) / 2,
            };
          } else {
            // Fall off!
            player.state = 'falling';
            sound.playFallSound();
            sound.triggerHaptic('error');
            setTimeout(() => {
              setGameOver(true);
              const isNew = updateHighScore('jump', g.score);
              if (isNew) {
                setHighScore(g.score);
                confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
              }
            }, 600);
          }
        } else {
          // In Flight
          const t = g.jumpProgress;
          player.x = g.jumpStart.x + (g.jumpEnd.x - g.jumpStart.x) * t;
          player.y = g.jumpStart.y + (g.jumpEnd.y - g.jumpStart.y) * t;

          // Parabolic height
          const arcHeight = 110;
          player.z = currentPlat.height + 4 * arcHeight * t * (1 - t);

          // 360 degree roll flip during jump
          player.rotation = t * Math.PI * 2;
        }
      }

      // Handle Falling
      if (player.state === 'falling') {
        player.z -= dt * 320;
        player.scaleY = Math.max(0.2, player.scaleY - dt * 0.8);
      }

      // Update particles
      for (let i = g.particles.length - 1; i >= 0; i--) {
        const p = g.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.alpha -= dt * 1.5;
        if (p.alpha <= 0) {
          g.particles.splice(i, 1);
        }
      }

      // --- RENDER CANVAS ---
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      // Render background gradient (authentic WeChat calm clean gradient)
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#d1d8e0');
      bgGrad.addColorStop(1, '#a5b1c2');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Render Platforms
      platforms.forEach((plat, idx) => {
        // Draw shadow on ground
        const basePos = worldToScreen(plat.x, plat.y, 0, g.camera.x, g.camera.y, width, height);
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(basePos.x + 8, basePos.y + 6, plat.width * 0.72, plat.width * 0.42, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
        ctx.fill();
        ctx.restore();

        // Platform top position
        const topPos = worldToScreen(plat.x, plat.y, plat.height, g.camera.x, g.camera.y, width, height);
        const w = plat.width;
        const h = plat.height;

        if (plat.type === 'cylinder') {
          // Render Cylinder
          // Side body
          ctx.save();
          const sideGrad = ctx.createLinearGradient(topPos.x - w / 2, 0, topPos.x + w / 2, 0);
          sideGrad.addColorStop(0, plat.sideColor);
          sideGrad.addColorStop(0.5, plat.topColor);
          sideGrad.addColorStop(1, plat.color);
          ctx.fillStyle = sideGrad;
          ctx.beginPath();
          ctx.ellipse(topPos.x, topPos.y, w / 2, w / 4, 0, 0, Math.PI);
          ctx.lineTo(topPos.x + w / 2, topPos.y + h);
          ctx.ellipse(topPos.x, topPos.y + h, w / 2, w / 4, 0, 0, Math.PI, false);
          ctx.lineTo(topPos.x - w / 2, topPos.y);
          ctx.fill();

          // Top ellipse
          ctx.beginPath();
          ctx.ellipse(topPos.x, topPos.y, w / 2, w / 4, 0, 0, Math.PI * 2);
          ctx.fillStyle = plat.topColor;
          ctx.fill();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.stroke();

          // Target center ring
          ctx.beginPath();
          ctx.ellipse(topPos.x, topPos.y, 10, 5, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#ef4444';
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(topPos.x, topPos.y, 4, 2, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.restore();
        } else {
          // Render 3D Box / Special Box
          const cos30 = 0.866;
          const sin30 = 0.5;
          const hw = w * 0.55;

          ctx.save();
          // Left face
          ctx.fillStyle = plat.sideColor;
          ctx.beginPath();
          ctx.moveTo(topPos.x, topPos.y + hw * sin30);
          ctx.lineTo(topPos.x - hw * cos30, topPos.y);
          ctx.lineTo(topPos.x - hw * cos30, topPos.y + h);
          ctx.lineTo(topPos.x, topPos.y + hw * sin30 + h);
          ctx.closePath();
          ctx.fill();

          // Right face
          ctx.fillStyle = plat.color;
          ctx.beginPath();
          ctx.moveTo(topPos.x, topPos.y + hw * sin30);
          ctx.lineTo(topPos.x + hw * cos30, topPos.y);
          ctx.lineTo(topPos.x + hw * cos30, topPos.y + h);
          ctx.lineTo(topPos.x, topPos.y + hw * sin30 + h);
          ctx.closePath();
          ctx.fill();

          // Top diamond face
          ctx.fillStyle = plat.topColor;
          ctx.beginPath();
          ctx.moveTo(topPos.x, topPos.y - hw * sin30);
          ctx.lineTo(topPos.x + hw * cos30, topPos.y);
          ctx.lineTo(topPos.x, topPos.y + hw * sin30);
          ctx.lineTo(topPos.x - hw * cos30, topPos.y);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.4)';
          ctx.stroke();

          // Distinctive Special Box Badges
          if (plat.type === 'music') {
            // Vinyl disc badge on top
            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            ctx.ellipse(topPos.x, topPos.y, 14, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#e2e8f0';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🎵', topPos.x, topPos.y);
          } else if (plat.type === 'store') {
            ctx.fillStyle = '#15803d';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('7-11', topPos.x, topPos.y);
          } else if (plat.type === 'express') {
            ctx.fillStyle = '#ca8a04';
            ctx.fillRect(topPos.x - 12, topPos.y - 2, 24, 4);
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('📦顺丰', topPos.x, topPos.y - 6);
          } else if (plat.type === 'rubik') {
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(topPos.x - 6, topPos.y - 4, 5, 4);
            ctx.fillStyle = '#3b82f6';
            ctx.fillRect(topPos.x, topPos.y - 4, 5, 4);
          }

          ctx.restore();
        }

        // Target platform index badge
        if (idx === currentIndex + 1) {
          ctx.save();
          ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.font = '11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🎯', topPos.x, topPos.y - 14);
          ctx.restore();
        }
      });

      // Render Particles
      g.particles.forEach((p) => {
        const scr = worldToScreen(p.x, p.y, currentPlat?.height || 48, g.camera.x, g.camera.y, width, height);
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(scr.x, scr.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Render Player (The Iconic WeChat Chess Piece / "小跳棋")
      const playerPos = worldToScreen(player.x, player.y, player.z, g.camera.x, g.camera.y, width, height);
      ctx.save();
      ctx.translate(playerPos.x, playerPos.y);
      ctx.rotate(player.rotation);
      ctx.scale(player.scaleX, player.scaleY);

      // Character shadow
      if (player.state !== 'falling') {
        ctx.beginPath();
        ctx.ellipse(0, 0, 14 * player.scaleX, 6, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.fill();
      }

      // Base cone body
      const bodyGrad = ctx.createLinearGradient(-10, -32, 10, 0);
      bodyGrad.addColorStop(0, '#2c3e50');
      bodyGrad.addColorStop(1, '#1a252f');
      ctx.fillStyle = bodyGrad;

      // Bottom curved base
      ctx.beginPath();
      ctx.ellipse(0, -6, 12, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cone waist
      ctx.beginPath();
      ctx.moveTo(-12, -6);
      ctx.quadraticCurveTo(-6, -20, -5, -26);
      ctx.lineTo(5, -26);
      ctx.quadraticCurveTo(6, -20, 12, -6);
      ctx.closePath();
      ctx.fill();

      // Head sphere
      const headGrad = ctx.createRadialGradient(-2, -34, 1, 0, -32, 9);
      headGrad.addColorStop(0, '#475569');
      headGrad.addColorStop(0.7, '#1e293b');
      headGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = headGrad;
      ctx.beginPath();
      ctx.arc(0, -32, 9, 0, Math.PI * 2);
      ctx.fill();

      // Eye glint
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.arc(-2, -34, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      g.animationFrameId = requestAnimationFrame(loop);
    };

    g.animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(g.animationFrameId);
    };
  }, [worldToScreen]);

  // Handle User Input (Mouse / Touch / Space)
  const handlePressStart = (e?: React.MouseEvent | React.TouchEvent | KeyboardEvent) => {
    if (e && 'button' in e && e.button !== 0) return;
    const g = gameState.current;
    if (g.player.state !== 'idle' || gameOver) return;

    g.player.state = 'charging';
    g.chargeStartTime = performance.now();
    setIsCharging(true);
    sound.startChargingSound();
    sound.triggerHaptic('light');
  };

  const handlePressEnd = () => {
    const g = gameState.current;
    if (g.player.state !== 'charging' || gameOver) return;

    setIsCharging(false);
    sound.stopChargingSound();
    sound.playJumpRelease();
    sound.triggerHaptic('medium');

    const elapsed = (performance.now() - g.chargeStartTime) / 1000;
    // Power factor: converts charge seconds to jump distance
    // Tuned so 0.3s - 1.0s cleanly lands on standard distances
    const power = Math.min(Math.max(elapsed, 0.08), 1.6);
    const jumpDist = power * 230;

    const currentPlat = g.platforms[g.currentIndex];
    const nextPlat = g.platforms[g.currentIndex + 1];

    if (!currentPlat || !nextPlat) return;

    // Vector pointing to next platform
    const dx = nextPlat.x - currentPlat.x;
    const dy = nextPlat.y - currentPlat.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    const dirX = len > 0 ? dx / len : 1;
    const dirY = len > 0 ? dy / len : 0;

    g.jumpStart = { x: currentPlat.x, y: currentPlat.y, z: currentPlat.height };
    g.jumpEnd = {
      x: currentPlat.x + dirX * jumpDist,
      y: currentPlat.y + dirY * jumpDist,
      z: nextPlat.height,
    };

    g.jumpProgress = 0;
    g.jumpDuration = 400 + power * 100;
    g.player.state = 'jumping';
  };

  // Keyboard space bar control support
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        handlePressStart();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handlePressEnd();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Revive mechanism (simulate WeChat friend share or quick revive)
  const handleRevive = () => {
    const g = gameState.current;
    const currentPlat = g.platforms[g.currentIndex];
    if (!currentPlat) return;

    g.player = {
      x: currentPlat.x,
      y: currentPlat.y,
      z: currentPlat.height,
      scaleY: 1,
      scaleX: 1,
      rotation: 0,
      state: 'idle',
    };
    g.targetCamera = { x: currentPlat.x, y: currentPlat.y };
    setGameOver(false);
    setRevived(true);
    sound.triggerHaptic('success');
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center select-none overflow-hidden bg-slate-900">
      {/* Top HUD */}
      <div className="absolute top-3 left-4 right-4 z-20 flex justify-between items-start pointer-events-none">
        <div>
          <div className="text-4xl font-extrabold text-white tracking-wider drop-shadow-md">
            {score}
          </div>
          <div className="text-xs text-white/75 font-medium mt-0.5 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-300" />
            历史最高: {highScore}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {onOpenHowToPlay && (
            <button
              onClick={onOpenHowToPlay}
              aria-label="玩法说明"
              className="p-2 rounded-full bg-black/35 backdrop-blur text-white hover:bg-black/50 transition-colors active:scale-95"
              title="玩法说明"
            >
              <HelpCircle className="w-4 h-4 text-emerald-300" />
            </button>
          )}
          <button
            onClick={toggleSound}
            aria-label={soundEnabled ? '静音' : '开启声音'}
            className="p-2 rounded-full bg-black/35 backdrop-blur text-white hover:bg-black/50 transition-colors active:scale-95"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-red-400" />}
          </button>
          {onOpenLeaderboard && (
            <button
              onClick={onOpenLeaderboard}
              aria-label="排行榜"
              className="p-2 rounded-full bg-black/35 backdrop-blur text-white hover:bg-black/50 transition-colors active:scale-95"
            >
              <Trophy className="w-4 h-4 text-yellow-300" />
            </button>
          )}
        </div>
      </div>

      {/* Floating Center Combo Text Notification */}
      {comboText && (
        <div className="absolute top-28 z-20 flex flex-col items-center animate-bounce pointer-events-none">
          <span className="px-3 py-1 rounded-full bg-amber-400 text-amber-950 font-black text-sm shadow-lg tracking-wide border-2 border-white">
            {comboText.text} +{comboText.points}
          </span>
          {combo > 1 && (
            <span className="text-xs font-bold text-amber-200 mt-1 drop-shadow">
              连续靶心 x{combo} 连击！
            </span>
          )}
        </div>
      )}

      {/* Easter Egg Bonus Banner */}
      {bonusText && (
        <div className="absolute top-36 z-20 px-4 py-1.5 rounded-full bg-emerald-500 text-white font-bold text-xs shadow-lg tracking-wide border-2 border-white animate-pulse pointer-events-none flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5" />
          {bonusText}
        </div>
      )}

      {/* Canvas Area */}
      <div
        className="w-full flex-1 touch-none cursor-pointer flex items-center justify-center relative"
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
      >
        <canvas
          ref={canvasRef}
          width={420}
          height={680}
          className="w-full h-full max-w-[480px] object-cover"
        />

        {/* Center Instructions Hint when score is 0 */}
        {score === 0 && !isCharging && (
          <div className="absolute bottom-28 pointer-events-none bg-black/40 backdrop-blur-sm text-white/90 text-xs px-4 py-2 rounded-full border border-white/20 animate-pulse-glow flex items-center gap-2">
            <span>👆 长按屏幕蓄力，松开起跳</span>
          </div>
        )}
      </div>

      {/* Game Over Modal Sheet */}
      {gameOver && (
        <div className="absolute inset-0 z-30 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-fadeIn">
          <div className="w-full max-w-xs bg-white rounded-3xl p-6 shadow-2xl text-center flex flex-col items-center">
            <span className="text-3xl mb-1">🎮</span>
            <h3 className="text-xl font-bold text-slate-800">游戏结束</h3>
            <div className="my-4 py-3 px-6 bg-slate-50 rounded-2xl w-full border border-slate-100">
              <div className="text-xs text-slate-500 font-medium">本次得分</div>
              <div className="text-4xl font-black text-emerald-600 mt-1">{score}</div>
              <div className="text-xs text-slate-400 mt-1">
                最高记录: {Math.max(score, highScore)}
              </div>
            </div>

            <div className="w-full space-y-2.5">
              {!revived && (
                <button
                  onClick={handleRevive}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-sm shadow hover:opacity-95 active:scale-98 transition flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-amber-200" />
                  免费复活一次
                </button>
              )}

              <button
                onClick={initGame}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 text-white font-bold text-sm shadow hover:bg-slate-800 active:scale-98 transition flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                再玩一局
              </button>

              <button
                onClick={() => onOpenShare?.(score, '经典跳一跳')}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-sm hover:bg-emerald-100 active:scale-98 transition flex items-center justify-center gap-2 border border-emerald-200"
              >
                <Share2 className="w-4 h-4" />
                晒出战绩炫耀
              </button>

              {onBackToLobby && (
                <button
                  onClick={onBackToLobby}
                  className="w-full py-2 text-slate-400 hover:text-slate-600 text-xs font-medium transition"
                >
                  返回小游戏大厅
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
