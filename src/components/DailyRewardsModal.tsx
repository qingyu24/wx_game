import React, { useState } from 'react';
import { X, Gift, Check, Sparkles, Coins, Disc } from 'lucide-react';
import { getUserProfile, saveUserProfile } from '../utils/wechatData';
import { sound } from '../utils/sound';
import confetti from 'canvas-confetti';

interface DailyRewardsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DailyRewardsModal: React.FC<DailyRewardsModalProps> = ({ isOpen, onClose }) => {
  const [profile, setProfile] = useState(getUserProfile);
  const [activeTab, setActiveTab] = useState<'signin' | 'wheel'>('signin');
  const [spinning, setSpinning] = useState<boolean>(false);
  const [wheelDeg, setWheelDeg] = useState<number>(0);
  const [prizeNotice, setPrizeNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const daysRewards = [
    { day: 1, reward: '100 金币', icon: '🪙', type: 'coins', amount: 100 },
    { day: 2, reward: '复活卡 x1', icon: '💖', type: 'revive', amount: 1 },
    { day: 3, reward: '200 金币', icon: '🪙', type: 'coins', amount: 200 },
    { day: 4, reward: '洗牌道具 x2', icon: '🔀', type: 'shuffle', amount: 2 },
    { day: 5, reward: '撤销道具 x2', icon: '↩️', type: 'undo', amount: 2 },
    { day: 6, reward: '300 金币', icon: '🪙', type: 'coins', amount: 300 },
    { day: 7, reward: '至尊大礼包', icon: '🎁', type: 'mega', amount: 500 },
  ];

  const handleSignIn = () => {
    sound.playMatchSuccess();
    sound.triggerHaptic('success');
    confetti({ particleCount: 70, spread: 60 });

    const currentReward = daysRewards[Math.min(profile.signedDays - 1, 6)];
    const updated = {
      ...profile,
      coins: profile.coins + (currentReward.type === 'coins' ? currentReward.amount : 150),
      signedDays: profile.signedDays + 1,
      lastSignDate: new Date().toDateString(),
    };
    if (currentReward.type === 'revive') updated.reviveCards += 1;
    if (currentReward.type === 'shuffle') updated.shuffleCards += 2;
    if (currentReward.type === 'undo') updated.undoCards += 2;

    saveUserProfile(updated);
    setProfile(updated);
    setPrizeNotice(`签到成功！获得 ${currentReward.reward}`);
  };

  const wheelPrizes = [
    { label: '50金币', type: 'coins', val: 50, color: '#f59e0b' },
    { label: '复活卡', type: 'revive', val: 1, color: '#ec4899' },
    { label: '100金币', type: 'coins', val: 100, color: '#10b981' },
    { label: '洗牌卡', type: 'shuffle', val: 1, color: '#3b82f6' },
    { label: '200金币', type: 'coins', val: 200, color: '#8b5cf6' },
    { label: '大礼包', type: 'coins', val: 300, color: '#f97316' },
  ];

  const handleSpinWheel = () => {
    if (spinning) return;
    setSpinning(true);
    setPrizeNotice(null);
    sound.playButtonClick();

    // Random prize index 0-5
    const prizeIdx = Math.floor(Math.random() * wheelPrizes.length);
    const targetPrize = wheelPrizes[prizeIdx];

    const sliceAngle = 360 / wheelPrizes.length;
    // Extra full turns
    const extraTurns = 5 * 360;
    const finalAngle = extraTurns + (360 - prizeIdx * sliceAngle - sliceAngle / 2);

    setWheelDeg((prev) => prev + finalAngle);

    setTimeout(() => {
      setSpinning(false);
      sound.playVictoryFanfare();
      confetti({ particleCount: 80, spread: 70 });

      const updated = { ...profile };
      if (targetPrize.type === 'coins') updated.coins += targetPrize.val;
      if (targetPrize.type === 'revive') updated.reviveCards += targetPrize.val;
      if (targetPrize.type === 'shuffle') updated.shuffleCards += targetPrize.val;

      saveUserProfile(updated);
      setProfile(updated);
      setPrizeNotice(`恭喜转中: ${targetPrize.label}！已存入背包`);
    }, 3200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-scaleIn">
        {/* Top Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-amber-200" />
            <h3 className="font-extrabold text-base">每日福利大放送</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/20 active:scale-90 transition"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b border-slate-100 bg-slate-50 p-1.5 gap-2 text-xs">
          <button
            onClick={() => setActiveTab('signin')}
            className={`flex-1 py-1.5 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'signin'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            7天签到
          </button>
          <button
            onClick={() => setActiveTab('wheel')}
            className={`flex-1 py-1.5 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'wheel'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Disc className="w-3.5 h-3.5" />
            幸运大转盘
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 flex-1 overflow-y-auto">
          {prizeNotice && (
            <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs text-emerald-800 font-bold animate-bounce">
              🎉 {prizeNotice}
            </div>
          )}

          {activeTab === 'signin' ? (
            <div>
              <div className="text-xs text-slate-500 mb-3 text-center">
                连续签到可获海量金币与免死复活金牌
              </div>
              <div className="grid grid-cols-4 gap-2">
                {daysRewards.map((item, idx) => {
                  const isPast = idx < profile.signedDays - 1;
                  const isToday = idx === profile.signedDays - 1;
                  const isMega = item.day === 7;

                  return (
                    <div
                      key={item.day}
                      className={`p-2 rounded-2xl flex flex-col items-center justify-center text-center border relative transition ${
                        isMega ? 'col-span-2 bg-gradient-to-br from-amber-100 to-amber-200 border-amber-300' : ''
                      } ${
                        isPast
                          ? 'bg-slate-100 border-slate-200 opacity-60'
                          : isToday
                          ? 'bg-orange-50 border-orange-400 shadow-sm ring-2 ring-orange-300'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <span className="text-[10px] font-bold text-slate-500">第{item.day}天</span>
                      <span className="text-2xl my-1">{item.icon}</span>
                      <span className="text-[10px] font-semibold text-slate-700 leading-tight">
                        {item.reward}
                      </span>
                      {isPast && (
                        <div className="absolute inset-0 bg-slate-900/10 rounded-2xl flex items-center justify-center">
                          <Check className="w-4 h-4 text-emerald-600" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleSignIn}
                className="w-full mt-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-sm shadow hover:opacity-95 active:scale-98 transition flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                立即打卡签到
              </button>
            </div>
          ) : (
            // Lucky Wheel
            <div className="flex flex-col items-center">
              <div className="relative w-52 h-52 my-2 flex items-center justify-center">
                {/* Rotating wheel plate */}
                <div
                  style={{
                    transform: `rotate(${wheelDeg}deg)`,
                    transition: spinning ? 'transform 3.2s cubic-bezier(0.15, 0.9, 0.25, 1)' : 'none',
                  }}
                  className="w-full h-full rounded-full border-4 border-amber-400 shadow-xl overflow-hidden relative"
                >
                  {wheelPrizes.map((p, i) => {
                    const rot = i * 60;
                    return (
                      <div
                        key={i}
                        style={{
                          transform: `rotate(${rot}deg)`,
                          transformOrigin: '50% 100%',
                          backgroundColor: p.color,
                        }}
                        className="absolute top-0 left-[25%] w-[50%] h-[50%] flex flex-col items-center pt-2 text-white font-extrabold text-[11px] drop-shadow-xs"
                      >
                        {p.label}
                      </div>
                    );
                  })}
                </div>

                {/* Center Spin Pointer */}
                <button
                  onClick={handleSpinWheel}
                  disabled={spinning}
                  className="absolute w-14 h-14 rounded-full bg-slate-900 text-amber-300 font-black text-xs shadow-2xl border-2 border-white flex flex-col items-center justify-center active:scale-95 transition z-10"
                >
                  <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px] border-b-slate-900 absolute -top-2" />
                  <span>{spinning ? '抽奖中' : 'GO!'}</span>
                </button>
              </div>

              <div className="text-center text-xs text-slate-500 mt-2">
                每日免费赠送 3 次抽奖机会，奖品100%必中！
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
