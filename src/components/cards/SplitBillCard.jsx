import React from 'react';
import { formatCurrency, formatThaiDatePretty } from '../../lib/dateUtils';
import { ACCOUNT_MAP } from '../../types/constants';
import { Users, CreditCard, Sparkles, CheckCircle, Clock } from 'lucide-react';

export const SplitBillCard = ({ data }) => {
  if (!data) return null;
  const { bill, members, updatedAccounts, transaction } = data;

  const payingAcc = ACCOUNT_MAP[transaction?.account_id || 'ktb'];
  const totalAmount = bill?.total_amount || 0;

  // Extract user share from note tag or calculation
  let userShare = 0;
  if (transaction?.note) {
    const match = transaction.note.match(/\[split_share:([\d.]+)\]/);
    if (match) userShare = parseFloat(match[1]);
  }

  return (
    <div className="mt-3 rounded-2xl bg-[#181826] border border-white/10 p-4 shadow-glass transition-all hover:border-white/20">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/5">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-neon-lime/15 text-neon-lime flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-neon-lime font-semibold uppercase tracking-wider flex items-center space-x-1">
              <span>บิลหารกับเพื่อน</span>
              <Sparkles className="w-3 h-3" />
            </div>
            <div className="font-semibold text-white text-base leading-tight">
              {bill?.title || 'รายการหารบิล'}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-slate-400">ยอดเต็มบิล</div>
          <div className="text-lg font-bold text-white">
            ฿{formatCurrency(totalAmount)}
          </div>
        </div>
      </div>

      {/* Meta Bar */}
      <div className="flex items-center justify-between py-2 text-xs text-slate-300 border-b border-white/5">
        <div className="flex items-center space-x-1.5">
          <CreditCard className="w-3.5 h-3.5 text-slate-400" />
          <span>สำรองจ่ายด้วย:</span>
          <span
            className="px-2 py-0.5 rounded-full font-medium text-[11px]"
            style={{ backgroundColor: `${payingAcc?.accentColor}25`, color: payingAcc?.accentColor }}
          >
            {payingAcc?.name || 'KTB'}
          </span>
        </div>

        <div className="text-neon-lime font-medium">
          ส่วนของคุณ: <span className="font-bold">฿{formatCurrency(userShare)}</span>
        </div>
      </div>

      {/* Members Breakdown */}
      <div className="pt-3 space-y-2">
        <div className="text-[11px] text-slate-400 font-semibold tracking-wider">
          สมาชิกที่ต้องจ่าย ({members?.length || 0} คน):
        </div>

        <div className="space-y-1.5">
          {(members || []).map((m, idx) => (
            <div
              key={m.id || idx}
              className="flex items-center justify-between bg-black/25 px-3 py-2 rounded-xl border border-white/5"
            >
              <div className="flex items-center space-x-2.5">
                <img
                  src="/avatars/male-animated.svg"
                  alt={m.name}
                  className="w-6 h-6 rounded-full border border-blue-400/40 bg-slate-800"
                />
                <span className="text-xs font-semibold text-slate-200">{m.name}</span>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-100">
                  ฿{formatCurrency(m.amount)}
                </span>
                {m.is_paid ? (
                  <span className="flex items-center text-[10px] text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded-md">
                    <CheckCircle className="w-3 h-3 mr-0.5" /> จ่ายแล้ว
                  </span>
                ) : (
                  <span className="flex items-center text-[10px] text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded-md">
                    <Clock className="w-3 h-3 mr-0.5" /> รอโอน
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
