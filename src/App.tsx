/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { WeChatNavbar } from './components/WeChatNavbar';
import { WeChatActionSheet } from './components/WeChatActionSheet';
import { Lobby, GameKey } from './components/Lobby';
import { TiaoYiTiao } from './components/games/TiaoYiTiao';
import { YangLeGeYang } from './components/games/YangLeGeYang';
import { DaXiGua } from './components/games/DaXiGua';
import { LeaderboardModal } from './components/LeaderboardModal';
import { SharePosterModal } from './components/SharePosterModal';
import { DailyRewardsModal } from './components/DailyRewardsModal';
import { AboutModal } from './components/AboutModal';
import { HowToPlayModal } from './components/HowToPlayModal';
import { sound } from './utils/sound';
import { Smartphone, Monitor, Trophy, Gift, Volume2, VolumeX, HelpCircle } from 'lucide-react';

export default function App() {
  const [currentGame, setCurrentGame] = useState<GameKey | 'lobby'>('lobby');
  const [gameKeyInstance, setGameKeyInstance] = useState<number>(0);
  const [isPhoneFrame, setIsPhoneFrame] = useState<boolean>(true);

  // Modals state
  const [isActionSheetOpen, setIsActionSheetOpen] = useState<boolean>(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState<boolean>(false);
  const [leaderboardTab, setLeaderboardTab] = useState<'jump' | 'sheep' | 'watermelon' | 'province'>('jump');
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [shareData, setShareData] = useState<{ score: number; gameName: string }>({
    score: 0,
    gameName: '跳一跳',
  });
  const [isRewardsOpen, setIsRewardsOpen] = useState<boolean>(false);
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);
  const [soundMuted, setSoundMuted] = useState<boolean>(sound.getMuted());

  // How to Play Modal state
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState<boolean>(false);
  const [howToPlayGame, setHowToPlayGame] = useState<GameKey | null>(null);
  const [isFirstTimeTutorial, setIsFirstTimeTutorial] = useState<boolean>(false);
  const [pendingGame, setPendingGame] = useState<GameKey | null>(null);

  // Window resize auto-detect: on small screens, default to immersive fullscreen
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      setIsPhoneFrame(false);
    }
  }, []);

  const handleToggleSound = () => {
    const next = !soundMuted;
    setSoundMuted(next);
    sound.setMuted(next);
  };

  const handleOpenShare = (score: number, gameName: string) => {
    setShareData({ score, gameName });
    setIsShareModalOpen(true);
  };

  const handleOpenLeaderboard = (tab: 'jump' | 'sheep' | 'watermelon' | 'province' = 'jump') => {
    setLeaderboardTab(tab);
    setIsLeaderboardOpen(true);
  };

  const handleRestartGame = () => {
    // Increment instance key to force re-mount
    setGameKeyInstance((prev) => prev + 1);
  };

  // Handle Game Selection with First-Time Tutorial Check
  const handleSelectGame = (game: GameKey) => {
    let hasSeen = false;
    try {
      hasSeen = localStorage.getItem(`wx_tutorial_seen_${game}`) === 'true';
    } catch {}

    if (!hasSeen) {
      // First time selecting this game: show How to Play modal
      setHowToPlayGame(game);
      setIsFirstTimeTutorial(true);
      setPendingGame(game);
      setIsHowToPlayOpen(true);
    } else {
      // Already seen: directly launch game
      setCurrentGame(game);
    }
  };

  const handleManualOpenHowToPlay = (game?: GameKey) => {
    const targetGame = game || (currentGame !== 'lobby' ? (currentGame as GameKey) : 'jump');
    setHowToPlayGame(targetGame);
    setIsFirstTimeTutorial(false);
    setPendingGame(null);
    setIsHowToPlayOpen(true);
  };

  const handleCloseHowToPlay = () => {
    if (pendingGame) {
      setCurrentGame(pendingGame);
      setPendingGame(null);
    }
    setIsHowToPlayOpen(false);
  };

  const getGameTitle = () => {
    switch (currentGame) {
      case 'jump':
        return '跳一跳';
      case 'sheep':
        return '羊了个羊';
      case 'watermelon':
        return '合成大西瓜';
      default:
        return '微信小游戏精选乐园';
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-slate-900 text-slate-800 flex flex-col items-center justify-center relative select-none">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Floating App Bar (Desktop helper buttons) */}
      <div className="hidden sm:flex items-center gap-3 absolute top-3 z-40 px-4 py-1.5 rounded-full bg-slate-800/80 backdrop-blur-md border border-slate-700/80 shadow-lg text-xs text-slate-200">
        <span className="flex items-center gap-1.5 font-bold text-white">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          微信小游戏合集
        </span>
        <span className="text-slate-600">|</span>

        {/* Frame Toggle */}
        <button
          onClick={() => setIsPhoneFrame(!isPhoneFrame)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-slate-700 active:scale-95 transition text-slate-300 hover:text-white"
          title="切换手机外观/铺满模式"
        >
          {isPhoneFrame ? (
            <>
              <Monitor className="w-3.5 h-3.5" />
              <span>全屏宽屏模式</span>
            </>
          ) : (
            <>
              <Smartphone className="w-3.5 h-3.5" />
              <span>微信真机框模式</span>
            </>
          )}
        </button>

        <span className="text-slate-600">|</span>

        {/* How to Play button */}
        <button
          onClick={() => handleManualOpenHowToPlay()}
          className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-emerald-300 transition"
          title="玩法说明"
        >
          <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
          玩法指南
        </button>

        {/* Quick Ranking */}
        <button
          onClick={() => handleOpenLeaderboard(currentGame === 'lobby' ? 'jump' : (currentGame as 'jump' | 'sheep' | 'watermelon'))}
          className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-amber-300 transition"
        >
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          好友排行
        </button>

        {/* Quick Rewards */}
        <button
          onClick={() => setIsRewardsOpen(true)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-orange-300 transition"
        >
          <Gift className="w-3.5 h-3.5 text-orange-400" />
          每日签到
        </button>

        {/* Sound toggle */}
        <button
          onClick={handleToggleSound}
          className="p-1 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition"
          title="全局音效开关"
        >
          {soundMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
        </button>
      </div>

      {/* Main WeChat Application Container */}
      <div
        className={`relative flex flex-col overflow-hidden transition-all duration-300 ${
          isPhoneFrame
            ? 'w-full max-w-[430px] h-[92vh] max-h-[860px] rounded-[42px] border-[10px] border-slate-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] ring-1 ring-slate-700/50 bg-[#ededed]'
            : 'w-full h-full max-w-full rounded-none border-0 shadow-none bg-[#ededed]'
        }`}
      >
        {/* Dynamic Island / iPhone Speaker Notch in Phone Mode */}
        {isPhoneFrame && (
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-900 rounded-full z-40 flex items-center justify-center pointer-events-none">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-800 mr-2"></div>
            <div className="w-8 h-1 rounded-full bg-slate-800"></div>
          </div>
        )}

        {/* WeChat Standard Header Navbar */}
        <WeChatNavbar
          title={getGameTitle()}
          onOpenActionSheet={() => setIsActionSheetOpen(true)}
          onCloseGame={() => setCurrentGame('lobby')}
          isGameActive={currentGame !== 'lobby'}
        />

        {/* Main Content Area: Lobby or Active Mini-Game */}
        <main className="flex-1 w-full h-full relative overflow-hidden flex flex-col">
          {currentGame === 'lobby' && (
            <Lobby
              onSelectGame={handleSelectGame}
              onOpenLeaderboard={() => handleOpenLeaderboard('jump')}
              onOpenRewards={() => setIsRewardsOpen(true)}
              onOpenAbout={() => setIsAboutOpen(true)}
              onOpenHowToPlay={(g) => handleManualOpenHowToPlay(g)}
            />
          )}

          {currentGame === 'jump' && (
            <TiaoYiTiao
              key={`jump_${gameKeyInstance}`}
              onBackToLobby={() => setCurrentGame('lobby')}
              onOpenShare={(s, name) => handleOpenShare(s, name)}
              onOpenLeaderboard={() => handleOpenLeaderboard('jump')}
              onOpenHowToPlay={() => handleManualOpenHowToPlay('jump')}
            />
          )}

          {currentGame === 'sheep' && (
            <YangLeGeYang
              key={`sheep_${gameKeyInstance}`}
              onBackToLobby={() => setCurrentGame('lobby')}
              onOpenShare={(s, name) => handleOpenShare(s, name)}
              onOpenLeaderboard={() => handleOpenLeaderboard('sheep')}
              onOpenHowToPlay={() => handleManualOpenHowToPlay('sheep')}
            />
          )}

          {currentGame === 'watermelon' && (
            <DaXiGua
              key={`watermelon_${gameKeyInstance}`}
              onBackToLobby={() => setCurrentGame('lobby')}
              onOpenShare={(s, name) => handleOpenShare(s, name)}
              onOpenLeaderboard={() => handleOpenLeaderboard('watermelon')}
              onOpenHowToPlay={() => handleManualOpenHowToPlay('watermelon')}
            />
          )}
        </main>
      </div>

      {/* Global WeChat Mini-Program Modals & Drawers */}
      <WeChatActionSheet
        isOpen={isActionSheetOpen}
        onClose={() => setIsActionSheetOpen(false)}
        onShareFriends={() => handleOpenShare(888, getGameTitle())}
        onShareMoments={() => handleOpenShare(888, getGameTitle())}
        onRestartGame={handleRestartGame}
        onOpenAbout={() => setIsAboutOpen(true)}
        onOpenHowToPlay={() => {
          const g = currentGame !== 'lobby' ? (currentGame as GameKey) : 'jump';
          handleManualOpenHowToPlay(g);
        }}
        soundMuted={soundMuted}
        onToggleSound={handleToggleSound}
        currentGameTitle={getGameTitle()}
      />

      {/* How to Play Modal (Auto on first play & manual from help buttons) */}
      <HowToPlayModal
        isOpen={isHowToPlayOpen}
        gameKey={howToPlayGame}
        isFirstTime={isFirstTimeTutorial}
        onClose={handleCloseHowToPlay}
        onStartGame={handleCloseHowToPlay}
      />

      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        defaultTab={leaderboardTab}
      />

      <SharePosterModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        gameName={shareData.gameName}
        score={shareData.score}
      />

      <DailyRewardsModal
        isOpen={isRewardsOpen}
        onClose={() => setIsRewardsOpen(false)}
      />

      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />
    </div>
  );
}
