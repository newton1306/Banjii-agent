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
    <div className="flex items-center space-x-2 overflow-x-auto py-2 px-3 no-scrollbar max-w-3xl mx-auto w-full">
      {QUICK_PROMPTS.map((item, idx) => (
        <button
          key={idx}
          type="button"
          disabled={disabled}
          onClick={() => onSelectPrompt(item.prompt)}
          className="shrink-0 px-3.5 py-1.5 rounded-full bg-[#181826]/90 hover:bg-[#202036] active:scale-95 border border-white/10 hover:border-neon-lime/40 text-xs font-medium text-slate-300 hover:text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center space-x-1.5 backdrop-blur-md"
        >
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
};
