import React from 'react';

export const QUICK_PROMPTS = [
  {
    label: '🍽️ ทานข้าว',
    prompt: 'กินข้าวแกงกะหรี่ 180 จ่าย kbank',
  },
  {
    label: '🏸 ตีแบดหารบิล',
    prompt: 'จ่ายค่าคอร์ทแบด 995 ktb หารกับ Nine, Praew, Non คนละเท่าๆ กัน ส่วนเรา 70',
  },
  {
    label: '👥 Non โอนคืน',
    prompt: 'Non โอนคืน 150 เข้า kbank',
  },
  {
    label: '💳 โอนเงินข้ามบัญชี',
    prompt: 'โอนเงินจาก ktb ไป kbank 500',
  },
  {
    label: '📊 เช็คยอดเงิน & หนี้',
    prompt: 'ตอนนี้เหลือเงินแต่ละบัญชีเท่าไหร่ และใครติดเงินเราบ้าง',
  },
  {
    label: '⏱️ รายการล่าสุด',
    prompt: 'ดูรายการล่าสุด 5 รายการ',
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
