import React, { useState } from 'react';
import { X, Heart, Trophy, Medal, Sparkles, MapPin } from 'lucide-react';
import { getFriendsList, saveFriendsList, getUserProfile, PROVINCE_SHEEP_RANK, WeChatFriend } from '../utils/wechatData';
import { sound } from '../utils/sound';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'jump' | 'sheep' | 'watermelon' | 'province';
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'jump',
}) => {
  const [tab, setTab] = useState<'jump' | 'sheep' | 'watermelon' | 'province'>(defaultTab);
  const [friends, setFriends] = useState<WeChatFriend[]>(getFriendsList);
  const userProfile = getUserProfile();

  if (!isOpen) return null;

  // Toggle like on a friend
  const handleLike = (friendId: string) => {
    sound.playButtonClick();
    sound.triggerHaptic('light');

    setFriends((prev) => {
      const next = prev.map((f) => {
        if (f.id === friendId) {
          const hasLiked = !f.hasLiked;
          return {
            ...f,
            hasLiked,
            likes: hasLiked ? f.likes + 1 : f.likes - 1,
          };
        }
        return f;
      });
      saveFriendsList(next);
      return next;
    });
  };

  // Build sorted list including current user
  const userAsFriend: WeChatFriend = {
    id: 'user_self',
    name: userProfile.nickname + ' (我)',
    avatar: userProfile.avatar,
    title: '微信高能玩家',
    scores: {
      jump: userProfile.highScores.jump,
      sheepLevel: userProfile.highScores.sheepWins > 0 ? 2 : 1,
      watermelon: userProfile.highScores.watermelon,
    },
    likes: 99,
    statusText: '正在冲击朋友圈第一名！🚀',
  };

  const combinedList = [...friends, userAsFriend];

  let sortedList = [...combinedList];
  if (tab === 'jump') {
    sortedList.sort((a, b) => b.scores.jump - a.scores.jump);
  } else if (tab === 'sheep') {
    sortedList.sort((a, b) => b.scores.sheepLevel - a.scores.sheepLevel || b.likes - a.likes);
  } else if (tab === 'watermelon') {
    sortedList.sort((a, b) => b.scores.watermelon - a.scores.watermelon);
  }

  const myRank = sortedList.findIndex((item) => item.id === 'user_self') + 1;
  const beatenPercent = Math.min(99.4, Math.max(30, 100 - (myRank / sortedList.length) * 100)).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-300" />
            <h3 className="font-extrabold text-base">微信好友排行榜</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/20 active:scale-90 transition"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Tab Filters */}
        <div className="flex border-b border-slate-100 bg-slate-50 p-1.5 gap-1 text-xs">
          <button
            onClick={() => setTab('jump')}
            className={`flex-1 py-1.5 rounded-xl font-bold transition ${
              tab === 'jump'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            跳一跳
          </button>
          <button
            onClick={() => setTab('sheep')}
            className={`flex-1 py-1.5 rounded-xl font-bold transition ${
              tab === 'sheep'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            羊了个羊
          </button>
          <button
            onClick={() => setTab('watermelon')}
            className={`flex-1 py-1.5 rounded-xl font-bold transition ${
              tab === 'watermelon'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            大西瓜
          </button>
          <button
            onClick={() => setTab('province')}
            className={`flex-1 py-1.5 rounded-xl font-bold transition ${
              tab === 'province'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            省份榜
          </button>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
          {tab === 'province' ? (
            // Province Sheep Flock Leaderboard
            <div className="space-y-1.5 py-1">
              <div className="px-2 py-1 text-[11px] text-slate-500 flex items-center justify-between">
                <span>全国省份通关羊群大比拼</span>
                <span className="text-emerald-600 font-bold">每天0点刷新</span>
              </div>
              {PROVINCE_SHEEP_RANK.map((prov) => {
                const isMyProv = prov.name === userProfile.province;
                return (
                  <div
                    key={prov.name}
                    className={`flex items-center justify-between p-2.5 rounded-2xl ${
                      isMyProv ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 text-center font-black text-sm">
                        {prov.rank === 1 ? '🥇' : prov.rank === 2 ? '🥈' : prov.rank === 3 ? '🥉' : prov.rank}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                          {prov.name}
                          {isMyProv && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-emerald-600 text-white rounded-full font-medium">
                              我所在的省
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">羊村战队</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-emerald-600 text-sm">{prov.sheep.toLocaleString()} 只</div>
                      <div className="text-[10px] text-slate-400">已入羊群</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Friends Ranking
            sortedList.map((friend, idx) => {
              const rank = idx + 1;
              const isSelf = friend.id === 'user_self';
              let displayScore = 0;
              let scoreUnit = '分';
              if (tab === 'jump') {
                displayScore = friend.scores.jump;
              } else if (tab === 'sheep') {
                displayScore = friend.scores.sheepLevel;
                scoreUnit = '关';
              } else if (tab === 'watermelon') {
                displayScore = friend.scores.watermelon;
              }

              return (
                <div
                  key={friend.id}
                  className={`flex items-center justify-between p-2.5 rounded-2xl transition ${
                    isSelf ? 'bg-amber-50/80 border border-amber-200' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Rank indicator */}
                    <div className="w-5 text-center font-black text-sm shrink-0">
                      {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                    </div>

                    {/* Avatar */}
                    <img
                      src={friend.avatar}
                      alt={friend.name}
                      className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-200"
                    />

                    {/* Info */}
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-800 truncate flex items-center gap-1">
                        {friend.name}
                        {isSelf && (
                          <span className="text-[9px] px-1 bg-amber-500 text-white rounded font-bold">
                            我
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {friend.statusText}
                      </div>
                    </div>
                  </div>

                  {/* Score & Likes */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="font-black text-sm text-slate-800">
                        {displayScore} <span className="text-[10px] font-normal text-slate-500">{scoreUnit}</span>
                      </div>
                    </div>

                    {!isSelf && (
                      <button
                        onClick={() => handleLike(friend.id)}
                        className={`flex items-center gap-1 p-1.5 rounded-xl transition active:scale-90 ${
                          friend.hasLiked
                            ? 'bg-rose-100 text-rose-600'
                            : 'bg-slate-100 text-slate-400 hover:text-rose-500'
                        }`}
                        title="给好友点赞"
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${friend.hasLiked ? 'fill-rose-500' : ''}`}
                        />
                        <span className="text-[10px] font-bold">{friend.likes}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer: User Rank Summary Banner */}
        {tab !== 'province' && (
          <div className="px-4 py-2.5 bg-slate-900 text-white flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>
                当前你的排名: <strong className="text-amber-300 font-bold">第 {myRank} 名</strong>
              </span>
            </div>
            <span className="text-emerald-400 font-medium">已超越 {beatenPercent}% 的好友</span>
          </div>
        )}
      </div>
    </div>
  );
};
