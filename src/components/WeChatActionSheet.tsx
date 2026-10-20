import React from 'react';
import { Share2, Image, RotateCcw, Info, Volume2, VolumeX, ShieldCheck, HelpCircle } from 'lucide-react';
import { sound } from '../utils/sound';

interface WeChatActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onShareFriends: () => void;
  onShareMoments: () => void;
  onRestartGame: () => void;
  onOpenAbout: () => void;
  onOpenHowToPlay?: () => void;
  soundMuted: boolean;
  onToggleSound: () => void;
  currentGameTitle: string;
}

export const WeChatActionSheet: React.FC<WeChatActionSheetProps> = ({
  isOpen,
  onClose,
  onShareFriends,
  onShareMoments,
  onRestartGame,
  onOpenAbout,
  onOpenHowToPlay,
  soundMuted,
  onToggleSound,
  currentGameTitle,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Action Sheet Panel */}
      <div className="relative w-full max-w-md mx-auto bg-[#f7f7f7] rounded-t-3xl overflow-hidden shadow-2xl p-4 flex flex-col gap-3 animate-slideUp">
        {/* Top Mini Program Info Card */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 px-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-white text-lg font-black shadow-sm">
              🎮
            </div>
            <div>
              <div className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                {currentGameTitle}
                <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 text-emerald-700 rounded font-normal">
                  官方小游戏
                </span>
              </div>
              <div className="text-[11px] text-slate-400">微信小游戏精选合集 v2.5.0</div>
            </div>
          </div>
        </div>

        {/* Action Grid Buttons */}
        <div className="grid grid-cols-4 gap-2 py-2">
          {/* Share Friends */}
          <button
            onClick={() => {
              sound.playButtonClick();
              onShareFriends();
              onClose();
            }}
            className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-white active:scale-95 transition"
          >
            <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-slate-200/60 flex items-center justify-center text-emerald-600">
              <Share2 className="w-6 h-6" />
            </div>
            <span className="text-xs text-slate-700 font-medium">转发给朋友</span>
          </button>

          {/* Share Moments */}
          <button
            onClick={() => {
              sound.playButtonClick();
              onShareMoments();
              onClose();
            }}
            className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-white active:scale-95 transition"
          >
            <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-slate-200/60 flex items-center justify-center text-amber-500">
              <Image className="w-6 h-6" />
            </div>
            <span className="text-xs text-slate-700 font-medium">分享朋友圈</span>
          </button>

          {/* Restart */}
          <button
            onClick={() => {
              sound.playButtonClick();
              onRestartGame();
              onClose();
            }}
            className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-white active:scale-95 transition"
          >
            <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-slate-200/60 flex items-center justify-center text-blue-600">
              <RotateCcw className="w-6 h-6" />
            </div>
            <span className="text-xs text-slate-700 font-medium">重新进入</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => {
              sound.playButtonClick();
              onToggleSound();
            }}
            className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-white active:scale-95 transition"
          >
            <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-slate-200/60 flex items-center justify-center text-slate-700">
              {soundMuted ? (
                <VolumeX className="w-6 h-6 text-red-500" />
              ) : (
                <Volume2 className="w-6 h-6 text-emerald-600" />
              )}
            </div>
            <span className="text-xs text-slate-700 font-medium">
              {soundMuted ? '开启音效' : '静音'}
            </span>
          </button>
        </div>

        {/* Secondary options list */}
        <div className="bg-white rounded-2xl overflow-hidden divide-y divide-slate-100 border border-slate-200/60">
          {onOpenHowToPlay && (
            <button
              onClick={() => {
                sound.playButtonClick();
                onOpenHowToPlay();
                onClose();
              }}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-2.5 text-slate-700 text-sm font-medium">
                <HelpCircle className="w-4 h-4 text-emerald-600" />
                玩法指南与操作说明
              </div>
              <span className="text-xs text-slate-400">查看 ›</span>
            </button>
          )}

          <button
            onClick={() => {
              sound.playButtonClick();
              onOpenAbout();
              onClose();
            }}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 transition"
          >
            <div className="flex items-center gap-2.5 text-slate-700 text-sm font-medium">
              <Info className="w-4 h-4 text-slate-400" />
              关于小游戏
            </div>
            <span className="text-xs text-slate-400">了解更多 ›</span>
          </button>

          <div className="w-full px-4 py-2.5 flex items-center justify-between text-left text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              微信绿色游戏认证 · 安全健康
            </div>
            <span className="text-[10px] text-slate-400">已保护</span>
          </div>
        </div>

        {/* Cancel Button */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-white text-slate-800 font-bold text-sm shadow-xs border border-slate-200/60 hover:bg-slate-50 active:scale-98 transition"
        >
          取消
        </button>
      </div>
    </div>
  );
};
