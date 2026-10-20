import React, { useState } from 'react';
import { X, Copy, Check, Download, Share2, Sparkles, QrCode } from 'lucide-react';
import { getUserProfile } from '../utils/wechatData';
import { sound } from '../utils/sound';

interface SharePosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameName: string;
  score: number;
}

export const SharePosterModal: React.FC<SharePosterModalProps> = ({
  isOpen,
  onClose,
  gameName,
  score,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const user = getUserProfile();

  if (!isOpen) return null;

  const braggingPhrases = [
    `我在微信《${gameName}》刚刚斩获了 ${score} 分！不服来战！🔥`,
    `手感火爆！今天在《${gameName}》轻松突破记录，谁来打破我的战绩？😎`,
    `快来看看我在《${gameName}》的高光时刻，战力已超过98%好友！🏆`,
  ];
  const shareText = braggingPhrases[0];

  const handleCopy = () => {
    sound.playButtonClick();
    sound.triggerHaptic('success');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="px-4 py-3 bg-[#ededed] border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-800 font-bold text-sm">
            <Share2 className="w-4 h-4 text-emerald-600" />
            微信朋友圈战绩海报
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slate-200 active:scale-90 transition text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Visual Poster Preview Card */}
        <div className="p-4 bg-slate-100 flex flex-col items-center">
          <div className="w-full bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 rounded-2xl p-5 text-white shadow-xl flex flex-col relative overflow-hidden border border-white/20">
            {/* Background glowing decorations */}
            <div className="absolute -right-10 -top-10 w-36 h-36 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -left-10 -bottom-10 w-36 h-36 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />

            {/* User Profile row */}
            <div className="flex items-center gap-2.5 z-10">
              <img
                src={user.avatar}
                alt={user.nickname}
                className="w-10 h-10 rounded-full border-2 border-white/80 object-cover shadow"
              />
              <div>
                <div className="font-bold text-sm flex items-center gap-1">
                  {user.nickname}
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                </div>
                <div className="text-[10px] text-white/70">向你发起了微信小游戏挑战</div>
              </div>
            </div>

            {/* Game & Score Feature Box */}
            <div className="my-5 py-4 px-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-center z-10 flex flex-col items-center">
              <span className="text-xs uppercase tracking-wider text-emerald-200 font-semibold">
                {gameName}
              </span>
              <div className="text-5xl font-black text-amber-300 my-1 tracking-tight drop-shadow-md">
                {score}
              </div>
              <div className="text-[11px] text-white/90 font-medium">
                荣耀战绩 · 已超越 98.4% 微信好友
              </div>
            </div>

            {/* Bottom Mini-Program QR / Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-white/15 text-[11px] text-white/80 z-10">
              <div className="flex items-center gap-1.5">
                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                  <QrCode className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="font-bold text-white text-[10px]">微信搜一搜</div>
                  <div className="text-[9px] text-white/70">长按识别参与对战</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-extrabold text-amber-300 text-xs">小游戏盒子</div>
                <div className="text-[9px] text-white/60">官方正版认证</div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-white space-y-2.5">
          <button
            onClick={handleCopy}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow flex items-center justify-center gap-2 active:scale-98 transition"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-white" />
                文案已复制！可直接粘贴发送朋友圈
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                一键复制炫耀文案
              </>
            )}
          </button>

          <button
            onClick={() => {
              sound.playButtonClick();
              alert('海报已保存到相册（模拟）！可以在微信中选择发送啦');
            }}
            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm flex items-center justify-center gap-2 active:scale-98 transition"
          >
            <Download className="w-4 h-4 text-slate-600" />
            保存海报到手机相册
          </button>
        </div>
      </div>
    </div>
  );
};
