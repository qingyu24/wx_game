import React, { useState, useEffect } from 'react';
import { Wifi, BatteryMedium } from 'lucide-react';
import { sound } from '../utils/sound';

interface WeChatNavbarProps {
  title: string;
  onOpenActionSheet: () => void;
  onCloseGame: () => void;
  isGameActive: boolean;
}

export const WeChatNavbar: React.FC<WeChatNavbarProps> = ({
  title,
  onOpenActionSheet,
  onCloseGame,
  isGameActive,
}) => {
  const [timeStr, setTimeStr] = useState<string>('12:00');

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      const hours = d.getHours().toString().padStart(2, '0');
      const mins = d.getMinutes().toString().padStart(2, '0');
      setTimeStr(`${hours}:${mins}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="w-full bg-[#ededed] border-b border-[#dcdcdc] select-none z-30 flex flex-col shrink-0">
      {/* Mobile OS Status Bar (Time, Wifi, Battery) */}
      <div className="w-full px-4 pt-1.5 pb-0.5 flex items-center justify-between text-[11px] font-semibold text-slate-700">
        <span className="tracking-tight">{timeStr}</span>
        <div className="flex items-center gap-1.5 text-slate-700">
          <Wifi className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold">5G</span>
          <BatteryMedium className="w-4 h-4" />
        </div>
      </div>

      {/* WeChat Mini-Program Header with Iconic Capsule Menu */}
      <div className="w-full h-11 px-3 flex items-center justify-between relative">
        {/* Applet Title */}
        <div className="flex items-center gap-1.5 overflow-hidden pr-24">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <h1 className="font-bold text-[15px] text-slate-800 truncate tracking-tight">
            {title}
          </h1>
        </div>

        {/* The Iconic WeChat Capsule Button (胶囊按钮) */}
        <div className="absolute right-3 flex items-center h-8 rounded-full bg-white/80 border border-slate-300/80 shadow-xs backdrop-blur-md px-1 divide-x divide-slate-200">
          {/* Menu button (...) */}
          <button
            onClick={() => {
              sound.playButtonClick();
              onOpenActionSheet();
            }}
            title="更多功能"
            aria-label="更多功能"
            className="px-2.5 h-full flex items-center justify-center text-slate-700 hover:text-slate-900 active:scale-90 transition-transform"
          >
            <div className="flex items-center gap-0.5">
              <span className="w-1 h-1 rounded-full bg-slate-800"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800"></span>
              <span className="w-1 h-1 rounded-full bg-slate-800"></span>
            </div>
          </button>

          {/* Close/Exit Mini-Game button (⭕) */}
          <button
            onClick={() => {
              sound.playButtonClick();
              onCloseGame();
            }}
            title={isGameActive ? '返回游戏大厅' : '最小化'}
            aria-label={isGameActive ? '返回游戏大厅' : '最小化'}
            className="px-2.5 h-full flex items-center justify-center text-slate-700 hover:text-slate-900 active:scale-90 transition-transform"
          >
            <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-800 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
