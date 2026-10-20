/**
 * WeChat Mini-Game local data, leaderboard, and profile manager
 */

export interface WeChatFriend {
  id: string;
  name: string;
  avatar: string;
  title: string;
  scores: {
    jump: number;
    sheepLevel: number;
    watermelon: number;
  };
  likes: number;
  hasLiked?: boolean;
  statusText: string;
}

export interface UserProfile {
  nickname: string;
  avatar: string;
  coins: number;
  energy: number;
  maxEnergy: number;
  province: string;
  highScores: {
    jump: number;
    sheepWins: number;
    watermelon: number;
  };
  reviveCards: number;
  shuffleCards: number;
  undoCards: number;
  signedDays: number;
  lastSignDate: string;
}

const STORAGE_KEY_USER = 'wx_mini_game_user';
const STORAGE_KEY_FRIENDS = 'wx_mini_game_friends';

const DEFAULT_FRIENDS: WeChatFriend[] = [
  {
    id: 'f1',
    name: '极客阿强',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    title: '微信跳一跳老玩家',
    scores: { jump: 486, sheepLevel: 2, watermelon: 3680 },
    likes: 42,
    statusText: '谁能超越我？手感正热🔥',
  },
  {
    id: 'f2',
    name: '安妮可可',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80',
    title: '羊村头号消除大师',
    scores: { jump: 312, sheepLevel: 2, watermelon: 4120 },
    likes: 38,
    statusText: '第二关终于过了，哭死😭',
  },
  {
    id: 'f3',
    name: '王大锤',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    title: '瓜王之争',
    scores: { jump: 238, sheepLevel: 1, watermelon: 4520 },
    likes: 29,
    statusText: '两个大西瓜就在眼前！',
  },
  {
    id: 'f4',
    name: '微风拂过',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    title: '摸鱼小达人',
    scores: { jump: 195, sheepLevel: 1, watermelon: 2890 },
    likes: 15,
    statusText: '下班前玩一把真香☕',
  },
  {
    id: 'f5',
    name: '追风少年',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
    title: '手速之王',
    scores: { jump: 360, sheepLevel: 2, watermelon: 3200 },
    likes: 22,
    statusText: '今天手感火爆！',
  },
  {
    id: 'f6',
    name: '柠檬不萌',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&auto=format&fit=crop&q=80',
    title: '休闲萌新',
    scores: { jump: 142, sheepLevel: 1, watermelon: 2150 },
    likes: 9,
    statusText: '求羊了个羊通关秘籍~',
  },
];

const DEFAULT_USER: UserProfile = {
  nickname: '微信小游戏玩家',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
  coins: 888,
  energy: 10,
  maxEnergy: 10,
  province: '广东省',
  highScores: {
    jump: 0,
    sheepWins: 0,
    watermelon: 0,
  },
  reviveCards: 3,
  shuffleCards: 2,
  undoCards: 2,
  signedDays: 1,
  lastSignDate: '',
};

export const PROVINCE_SHEEP_RANK = [
  { name: '广东省', sheep: 28410, rank: 1 },
  { name: '山东省', sheep: 24390, rank: 2 },
  { name: '浙江省', sheep: 21820, rank: 3 },
  { name: '江苏省', sheep: 19740, rank: 4 },
  { name: '四川省', sheep: 18230, rank: 5 },
  { name: '北京市', sheep: 16900, rank: 6 },
  { name: '上海市', sheep: 15400, rank: 7 },
  { name: '河南省', sheep: 14210, rank: 8 },
  { name: '湖北省', sheep: 12890, rank: 9 },
  { name: '湖南省', sheep: 11500, rank: 10 },
];

export function getUserProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    if (raw) {
      return { ...DEFAULT_USER, ...JSON.parse(raw) };
    }
  } catch {}
  return DEFAULT_USER;
}

export function saveUserProfile(profile: UserProfile) {
  try {
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(profile));
  } catch {}
}

export function getFriendsList(): WeChatFriend[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FRIENDS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return DEFAULT_FRIENDS;
}

export function saveFriendsList(friends: WeChatFriend[]) {
  try {
    localStorage.setItem(STORAGE_KEY_FRIENDS, JSON.stringify(friends));
  } catch {}
}

export function updateHighScore(game: 'jump' | 'watermelon', score: number): boolean {
  const profile = getUserProfile();
  let isNewHigh = false;
  if (game === 'jump' && score > profile.highScores.jump) {
    profile.highScores.jump = score;
    isNewHigh = true;
  } else if (game === 'watermelon' && score > profile.highScores.watermelon) {
    profile.highScores.watermelon = score;
    isNewHigh = true;
  }
  if (isNewHigh) {
    saveUserProfile(profile);
  }
  return isNewHigh;
}

export function recordSheepWin() {
  const profile = getUserProfile();
  profile.highScores.sheepWins += 1;
  profile.coins += 200;
  saveUserProfile(profile);
}
