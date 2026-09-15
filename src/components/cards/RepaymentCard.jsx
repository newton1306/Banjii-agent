import React, { useEffect } from 'react';
import { formatCurrency, formatThaiDatePretty } from '../../lib/dateUtils';
import { ACCOUNT_MAP } from '../../types/constants';
import { Handshake, CheckCircle, CreditCard, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

export const RepaymentCard = ({ data }) => {
  if (!data) return null;
  const { friendName, amountSettled, depositAccount, settledBills, updatedAccounts, transaction } = data;

  const dAcc = ACCOUNT_MAP[depositAccount] || { name: depositAccount, accentColor: '#138F2D' };
  const dBal = (updatedAccounts || []).find((a) => a.id === depositAccount)?.balance;

  useEffect(() => {
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#D4F933', '#5B4EFF', '#00A7E6', '#10B981'],
    });
  }, []);

  return (
    <div className="mt-3 rounded-2xl bg-[#181826] border border-white/10 p-4 shadow-glass transition-all hover:border-white/20">
      <div className="flex items-center justify-between pb-3 border-b border-white/5">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold">
            <Handshake className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-emerald-400 font-semibold uppercase tracking-wider flex items-center space-x-1">
              <span>เพื่อนโอนคืน / ตัดหนี้</span>
              <Sparkles className="w-3 h-3" />
            </div>
            <div className="font-semibold text-white text-base leading-tight">
              {friendName} โอนเงินคืนสำเร็จ
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-slate-400">ยอดที่ได้รับ</div>
          <div className="text-lg font-bold text-emerald-400">
            +฿{formatCurrency(amountSettled)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 py-3 text-xs border-b border-white/5">
        <div className="flex items-center space-x-2">
          <img
            src="/avatars/male-animated.svg"
            alt={friendName}
            className="w-6 h-6 rounded-full border border-emerald-400/40 bg-slate-800"
          />
          <span className="text-slate-300">เพื่อน:</span>
          <span className="font-semibold text-white">{friendName}</span>
        </div>

        <div className="flex items-center space-x-2">
          <CreditCard className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-300">เข้าบัญชี:</span>
          <span
            className="px-2 py-0.5 rounded-full font-medium text-[11px]"
            style={{ backgroundColor: `${dAcc.accentColor}25`, color: dAcc.accentColor }}
          >
            {dAcc.name}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2.5 text-xs text-slate-400">
        <span className="flex items-center text-emerald-400">
          <CheckCircle className="w-3.5 h-3.5 mr-1" />
          {settledBills && settledBills.length > 0
            ? `ตัดบิลค้างไป ${settledBills.length} รายการ`
            : 'บันทึกรายการรับเงินคืนลง Transactions เรียบร้อย'}
        </span>
        {dBal !== undefined && (
          <span className="text-slate-300">
            ยอดคงเหลือใหม่: <span className="font-bold text-white">฿{formatCurrency(dBal)}</span>
          </span>
        )}
      </div>
    </div>
  );
};
