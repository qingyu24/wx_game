import React from 'react';
import { Play, Trophy, Gift, Sparkles, Flame, Users, ArrowRight, ShieldCheck, Gamepad2, HelpCircle } from 'lucide-react';
import { getUserProfile, UserProfile } from '../utils/wechatData';
import { sound } from '../utils/sound';

export type GameKey = 'jump' | 'sheep' | 'watermelon';

interface LobbyProps {
  onSelectGame: (game: GameKey) => void;
  onOpenLeaderboard: () => void;
  onOpenRewards: () => void;
  onOpenAbout: () => void;
  onOpenHowToPlay?: (game: GameKey) => void;
}

export const Lobby: React.FC<LobbyProps> = ({
  onSelectGame,
  onOpenLeaderboard,
  onOpenRewards,
  onOpenAbout,
  onOpenHowToPlay,
}) => {
  const user: UserProfile = getUserProfile();

  const games = [
    {
      key: 'jump' as GameKey,
      title: '跳一跳',
      subtitle: '微信小游戏殿堂级鼻祖',
      desc: '长按蓄力，松开起跳！中心靶心连击倍增，停留唱片机便利店触发隐藏彩蛋。',
      icon: '♟️',
      bannerBg: 'from-slate-800 via-slate-900 to-indigo-950',
      badge: '霸榜经典',
      badgeColor: 'bg-indigo-500',
      players: '1.2 亿人玩过',
      highScore: user.highScores.jump,
      scoreUnit: '分',
    },
    {
      key: 'sheep' as GameKey,
      title: '羊了个羊',
      subtitle: '全国省份羊群狂热三消',
      desc: '7个卡槽，超难多层牌山！通关率仅0.1%，为你的省份战队赢取至尊领头羊！',
      icon: '🐑',
      bannerBg: 'from-emerald-700 via-green-800 to-lime-950',
      badge: '现象级爆款',
      badgeColor: 'bg-emerald-500',
      players: '8,900 万人玩过',
      highScore: user.highScores.sheepWins,
      scoreUnit: '次通关',
    },
    {
      key: 'watermelon' as GameKey,
      title: '合成大西瓜',
      subtitle: '解压Q弹真实水果物理合成',
      desc: '滑动瞄准投掷水果，同级碰撞爆浆合成！挑战合并两个巨型大西瓜！',
      icon: '🍉',
      bannerBg: 'from-amber-600 via-orange-700 to-rose-900',
      badge: '解压首选',
      badgeColor: 'bg-amber-500',
      players: '6,500 万人玩过',
      highScore: user.highScores.watermelon,
      scoreUnit: '分',
    },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-[#f4f5f7] select-none overflow-y-auto">
      {/* Top User Profile Header Strip */}
      <div className="bg-white px-4 py-3.5 border-b border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between">
          {/* User info */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={user.avatar}
                alt={user.nickname}
                className="w-12 h-12 rounded-2xl object-cover border-2 border-emerald-500 shadow-xs"
              />
              <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 bg-emerald-600 text-white text-[9px] font-bold rounded-full">
                Lv.8
              </span>
            </div>

            <div>
              <div className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
                {user.nickname}
                <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-800 font-bold rounded-md">
                  {user.province}战队
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                <span className="flex items-center gap-1 font-semibold text-amber-600">
                  🪙 {user.coins}
                </span>
                <span>•</span>
                <span className="text-[11px] text-slate-400">已连续签到 {user.signedDays} 天</span>
              </div>
            </div>
          </div>

          {/* Quick Actions (Rewards & Ranking) */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sound.playButtonClick();
                onOpenRewards();
              }}
              className="p-2 rounded-xl bg-orange-50 text-orange-600 border border-orange-200/80 flex flex-col items-center hover:bg-orange-100 active:scale-95 transition"
              title="每日福利"
            >
              <Gift className="w-4 h-4" />
              <span className="text-[9px] font-bold mt-0.5">福利</span>
            </button>

            <button
              onClick={() => {
                sound.playButtonClick();
                onOpenLeaderboard();
              }}
              className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex flex-col items-center hover:bg-emerald-100 active:scale-95 transition"
              title="好友排行榜"
            >
              <Trophy className="w-4 h-4 text-amber-500" />
              <span className="text-[9px] font-bold mt-0.5">榜单</span>
            </button>
          </div>
        </div>
      </div>

      {/* Hero Welcome Announcement */}
      <div className="p-4">
        <div className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 rounded-3xl p-4 text-white shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/10 rounded-l-full blur-xl pointer-events-none" />

          <div className="flex items-center gap-2 z-10">
            <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-bold tracking-wide">
              微信小游戏精选乐园
            </span>
            <span className="flex items-center gap-1 text-[11px] text-amber-200 font-semibold">
              <Flame className="w-3.5 h-3.5" /> 今日火爆
            </span>
          </div>

          <div className="my-2 z-10">
            <h2 className="text-xl font-black tracking-tight">重温经典 · 即点即玩</h2>
            <p className="text-xs text-white/80 mt-1 line-clamp-1">
              原汁原味还原跳一跳、羊了个羊、合成大西瓜，支持胶囊菜单与好友排行！
            </p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/20 z-10 text-[11px]">
            <span className="text-white/80 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> 微信好友正在热烈对决中
            </span>
            <button
              onClick={() => onSelectGame('jump')}
              className="px-3 py-1 bg-white text-emerald-800 rounded-full font-bold hover:bg-emerald-50 active:scale-95 transition flex items-center gap-1 text-xs"
            >
              快速开局 <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Games List Section */}
      <div className="px-4 pb-6 flex-1 flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 font-black text-slate-800 text-sm">
            <Gamepad2 className="w-4 h-4 text-emerald-600" />
            热门小游戏畅玩列表
          </div>
          <span className="text-[11px] text-slate-400">免安装 · 秒加载</span>
        </div>

        {games.map((game) => (
          <div
            key={game.key}
            onClick={() => {
              sound.playButtonClick();
              onSelectGame(game.key);
            }}
            className="group w-full bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md transition-all active:scale-[0.99] cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${game.bannerBg} flex items-center justify-center text-3xl shadow-md group-hover:scale-105 transition-transform`}
                >
                  {game.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base text-slate-900 group-hover:text-emerald-600 transition-colors">
                      {game.title}
                    </h3>
                    <span className={`text-[10px] text-white px-2 py-0.2 rounded-full font-bold ${game.badgeColor}`}>
                      {game.badge}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">
                    {game.subtitle}
                  </div>
                </div>
              </div>

              {/* Action buttons on card */}
              <div className="flex items-center gap-1.5 shrink-0">
                {onOpenHowToPlay && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      sound.playButtonClick();
                      onOpenHowToPlay(game.key);
                    }}
                    className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition active:scale-90"
                    title={`${game.title}玩法指南`}
                    aria-label={`${game.title}玩法指南`}
                  >
                    <HelpCircle className="w-4 h-4 text-slate-500 hover:text-emerald-600" />
                  </button>
                )}

                <button
                  className="w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-md active:scale-90 transition"
                  aria-label={`开始玩 ${game.title}`}
                >
                  <Play className="w-4 h-4 fill-white ml-0.5" />
                </button>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-slate-600 mt-2.5 leading-relaxed line-clamp-2">
              {game.desc}
            </p>

            {/* Stats row */}
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-[11px]">
              <span className="text-slate-400">{game.players}</span>
              <div className="flex items-center gap-1 font-bold text-slate-700">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                我的战绩: <span className="text-emerald-600">{game.highScore}</span> {game.scoreUnit}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="pb-6 pt-2 text-center text-xs text-slate-400 flex flex-col items-center gap-1">
        <div className="flex items-center gap-1.5 text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          微信小游戏官方标准架构 · 即点即玩
        </div>
        <button
          onClick={onOpenAbout}
          className="text-[11px] text-slate-400 hover:text-slate-600 underline"
        >
          小游戏免责声明与操作说明
        </button>
      </div>
    </div>
  );
};
