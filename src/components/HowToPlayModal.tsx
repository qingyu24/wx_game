import React, { useState } from 'react';
import { X, Play, Sparkles, CheckCircle2, HelpCircle, Flame, Keyboard, MousePointer } from 'lucide-react';
import { sound } from '../utils/sound';
import { GameKey } from './Lobby';

interface HowToPlayModalProps {
  isOpen: boolean;
  gameKey: GameKey | null;
  onClose: () => void;
  onStartGame?: () => void;
  isFirstTime?: boolean;
}

interface GuideContent {
  title: string;
  badge: string;
  badgeColor: string;
  icon: string;
  summary: string;
  controls: {
    icon: string;
    action: string;
    desc: string;
  }[];
  rules: string[];
  tips: {
    title: string;
    desc: string;
  }[];
}

const GAME_GUIDES: Record<GameKey, GuideContent> = {
  jump: {
    title: '跳一跳 · 玩法指南',
    badge: '经典跃迁',
    badgeColor: 'bg-indigo-500',
    icon: '♟️',
    summary: '操控标志性的小跳棋在不同几何方块间蓄力跳跃，挑战全微信好友最高得分记录！',
    controls: [
      {
        icon: '👆 / ␣',
        action: '长按屏幕 / 空格键',
        desc: '开始蓄力，小跳棋向下压缩变形，蓄力越久跳跃距离越远。',
      },
      {
        icon: '🖐️',
        action: '松开手指 / 空格键',
        desc: '小跳棋翻滚跃向下一个方块，精准降落在方块表面即得分。',
      },
    ],
    rules: [
      '小跳棋落在方块表面即成功前进并计 1 分。',
      '落点偏差过大跌落方块则本局结束（支持免费复活一次）。',
    ],
    tips: [
      {
        title: '🎯 靶心加倍连击',
        desc: '命中方块正中心白红靶心，得分直接翻倍并递增（+2, +4, +6, +8...），连击断掉重置。',
      },
      {
        title: '🎵 隐藏彩蛋奖励',
        desc: '在唱片机、7-Eleven便利店、快递盒、魔方上方静止停留 2 秒，自动触发专属声效与 +10 ~ +15 隐藏暴击加分！',
      },
    ],
  },
  sheep: {
    title: '羊了个羊 · 玩法指南',
    badge: '魔性三消',
    badgeColor: 'bg-emerald-500',
    icon: '🐑',
    summary: '风靡全网的魔鬼级益智三消！消除所有层叠卡牌，通关第2关代表你的省份战队登顶全国榜！',
    controls: [
      {
        icon: '👆',
        action: '点击高亮卡牌',
        desc: '点击未被上层遮挡的浅色高亮卡牌，卡牌将自动移入底部卡槽。',
      },
      {
        icon: '✨',
        action: '卡槽凑齐3张相同',
        desc: '槽内集齐 3 张相同图案即刻消除并播放欢快音效。',
      },
    ],
    rules: [
      '底部卡槽最多只能容纳 7 张卡牌。',
      '若 7 个卡槽全满且无法形成 3 连消除，则游戏判定挑战失败！',
      '第 1 关为教学热身关；第 2 关为极具挑战的真实千层羊群牌山。',
    ],
    tips: [
      {
        title: '🧰 三大救命法宝',
        desc: '【移出3张】可腾出卡槽；【撤销】可退回上一步；【洗牌】可打乱剩余所有牌面。',
      },
      {
        title: '🧠 消除优先级策略',
        desc: '时刻优先消除遮挡层数最深的中央塔牌，预留至少 2 个空闲卡槽防止暴毙。',
      },
    ],
  },
  watermelon: {
    title: '合成大西瓜 · 玩法指南',
    badge: 'Q弹合成',
    badgeColor: 'bg-amber-500',
    icon: '🍉',
    summary: '超解压的真实水果重力合成游戏！投掷水果，碰撞进化，终极目标是合成两个巨型大西瓜！',
    controls: [
      {
        icon: '👈👉',
        action: '左右滑动瞄准',
        desc: '手指在顶部横向滑动调整水果下落投掷位置，虚线标出准心轨迹。',
      },
      {
        icon: '👇',
        action: '点击 / 松手释放',
        desc: '点击屏幕或松开手指，水果顺应物理重力垂直掉落。',
      },
    ],
    rules: [
      '两个相同等级的水果相互触碰，瞬间爆浆融合成更高一阶的水果！',
      '水果进化阶梯：葡萄 ➔ 樱桃 ➔ 橘子 ➔ 柠檬 ➔ 猕猴桃 ➔ 番茄 ➔ 桃子 ➔ 菠萝 ➔ 椰子 ➔ 半瓜 ➔ 完整大西瓜。',
      '水果堆积过高超出顶部红色警戒虚线并持续 3.5 秒以上，游戏结束！',
    ],
    tips: [
      {
        title: '🍉 大瓜沉底法则',
        desc: '尽量让大水果（如椰子、菠萝）沉淀在两侧角落，小水果在上方滚动，避免出现卡缝空心。',
      },
      {
        title: '⚡ 连续连锁碰撞',
        desc: '一次投掷触发多级连环合并可获得指数级爆发得分！',
      },
    ],
  },
};

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({
  isOpen,
  gameKey,
  onClose,
  onStartGame,
  isFirstTime = false,
}) => {
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(true);

  if (!isOpen || !gameKey) return null;

  const guide = GAME_GUIDES[gameKey];
  if (!guide) return null;

  const handleConfirm = () => {
    sound.playButtonClick();
    if (dontShowAgain) {
      try {
        localStorage.setItem(`wx_tutorial_seen_${gameKey}`, 'true');
      } catch {}
    }
    onClose();
    if (onStartGame) {
      onStartGame();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 select-none">
      {/* Dark backdrop */}
      <div className="absolute inset-0 bg-black/65 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden animate-scaleIn border border-slate-100">
        {/* Top Header Banner */}
        <div className="px-4 py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-slate-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{guide.icon}</span>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-[15px] tracking-tight">{guide.title}</h3>
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold text-white ${guide.badgeColor}`}>
                  {guide.badge}
                </span>
              </div>
              <p className="text-[10px] text-white/80">
                {isFirstTime ? '新手初次进入 · 快速上手' : '官方游戏规则与操作秘籍'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 active:scale-90 transition text-white/90"
            aria-label="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs text-slate-700">
          {/* Summary Card */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-slate-600 leading-relaxed text-[11.5px]">
            {guide.summary}
          </div>

          {/* Controls section */}
          <div>
            <div className="flex items-center gap-1.5 font-extrabold text-slate-900 mb-2 text-xs">
              <MousePointer className="w-3.5 h-3.5 text-emerald-600" />
              <span>基础操作指引</span>
            </div>
            <div className="space-y-2">
              {guide.controls.map((ctrl, i) => (
                <div
                  key={i}
                  className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs flex items-start gap-2.5"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-sm border border-emerald-200/60">
                    {ctrl.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800 text-xs">{ctrl.action}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{ctrl.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rules Section */}
          <div>
            <div className="flex items-center gap-1.5 font-extrabold text-slate-900 mb-2 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>通关与计分规则</span>
            </div>
            <ul className="space-y-1.5 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100 text-[11px] text-slate-600 list-disc list-inside">
              {guide.rules.map((rule, idx) => (
                <li key={idx} className="leading-snug">
                  {rule}
                </li>
              ))}
            </ul>
          </div>

          {/* Tips & Secrets */}
          <div>
            <div className="flex items-center gap-1.5 font-extrabold text-slate-900 mb-2 text-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>大师进阶技巧</span>
            </div>
            <div className="space-y-2">
              {guide.tips.map((tip, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-amber-50/70 rounded-xl border border-amber-200/80 text-[11px]"
                >
                  <div className="font-bold text-amber-950 flex items-center gap-1">
                    {tip.title}
                  </div>
                  <div className="text-amber-900/80 mt-0.5 leading-relaxed">
                    {tip.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 shrink-0 space-y-2">
          {isFirstTime && (
            <label className="flex items-center justify-center gap-2 cursor-pointer text-[11px] text-slate-500 hover:text-slate-700">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
              />
              <span>不再自动弹出（随时可点右上角【?】重看）</span>
            </label>
          )}

          <button
            onClick={handleConfirm}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md active:scale-98 transition flex items-center justify-center gap-2"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            {isFirstTime ? '我知道了，立即开局！' : '返回游戏'}
          </button>
        </div>
      </div>
    </div>
  );
};
