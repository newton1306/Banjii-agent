import React from 'react';

export const QUICK_PROMPTS = [
  {
    label: '⏱️ รายการล่าสุด',
    prompt: 'รายการล่าสุด',
  },
  {
    label: '💰 เช็คยอดเงิน',
    prompt: 'เช็คยอดเงิน',
  },
];

export const QuickPromptChips = ({ onSelectPrompt, disabled = false }) => {
  return (
    <div className="flex items-center space-x-2 overflow-x-auto py-2 px-4 no-scrollbar">
      {QUICK_PROMPTS.map((item, idx) => (
        <button
          key={idx}
          disabled={disabled}
          onClick={() => onSelectPrompt(item.prompt)}
          className="shrink-0 px-3 py-1.5 rounded-xl bg-[#181826]/80 hover:bg-[#202034] active:scale-95 border border-white/10 hover:border-neon-lime/40 text-xs font-medium text-slate-200 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center space-x-1"
        >
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
};
