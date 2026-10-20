import React from 'react';
import { X, CheckCircle2, Sparkles, Smartphone, Volume2, Trophy, HelpCircle } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="px-4 py-3 bg-[#ededed] border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎮</span>
            <h3 className="font-bold text-sm text-slate-800">关于微信小游戏合集</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slate-200 active:scale-90 transition text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto text-xs text-slate-600 leading-relaxed">
          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center text-xl shrink-0 font-black shadow-xs">
              微
            </div>
            <div>
              <div className="font-bold text-slate-800 text-sm">微信小游戏精选合集</div>
              <div className="text-[11px] text-emerald-700 font-medium">版本 2.5.0 · 官方正版体验</div>
            </div>
          </div>

          <div>
            <h4 className="font-extrabold text-slate-900 mb-2 flex items-center gap-1.5 text-sm">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              游戏特色与操作指南
            </h4>
            <div className="space-y-2.5">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="font-bold text-slate-800 flex items-center gap-1">
                  ♟️ 跳一跳
                </div>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  • <strong>操作</strong>：长按屏幕（或键盘空格键）蓄力，松开即可跳跃。<br />
                  • <strong>得分秘籍</strong>：命中靶心连击可获得 +2, +4, +6... 超高加分；在唱片机、便利店、快递盒停留2秒可触发 +15 隐藏神秘彩蛋！
                </p>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="font-bold text-slate-800 flex items-center gap-1">
                  🐑 羊了个羊
                </div>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  • <strong>操作</strong>：点击未被上层遮挡的高亮牌，放入底部卡槽。<br />
                  • <strong>规则</strong>：卡槽集齐3张相同图案即可消除；槽满7张未消除则失败。通关第二关即可代表你的省份战队登顶全国榜！
                </p>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="font-bold text-slate-800 flex items-center gap-1">
                  🍉 合成大西瓜
                </div>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  • <strong>操作</strong>：左右滑动瞄准，点击松开投掷水果。<br />
                  • <strong>规则</strong>：相同水果碰撞即升级，注意不要让水果堆积超过红色警戒虚线！
                </p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-extrabold text-slate-900 mb-2 flex items-center gap-1.5 text-sm">
              <HelpCircle className="w-4 h-4 text-emerald-600" />
              微信胶囊控件说明
            </h4>
            <p className="text-slate-500 text-[11px]">
              • <strong>右上角胶囊【···】</strong>：点击展开微信操作面板，支持转发好友、分享朋友圈战绩海报、静音控制与重新进入小游戏。<br />
              • <strong>右上角胶囊【⭕】</strong>：随时一键返回小游戏大厅或切换游戏。
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs active:scale-98 transition shadow"
          >
            知道了，立即体验
          </button>
        </div>
      </div>
    </div>
  );
};
