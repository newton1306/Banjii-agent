import React from 'react';
import { formatCurrency, formatThaiDatePretty } from '../../lib/dateUtils';
import { ACCOUNT_MAP } from '../../types/constants';
import { ArrowRight, ArrowLeftRight, CheckCircle2 } from 'lucide-react';

export const TransferCard = ({ data }) => {
  if (!data) return null;
  const { sourceTx, destTx, updatedAccounts, pairId } = data;

  const sAcc = ACCOUNT_MAP[sourceTx?.account_id] || { name: sourceTx?.account_id, accentColor: '#00A7E6' };
  const dAcc = ACCOUNT_MAP[destTx?.account_id] || { name: destTx?.account_id, accentColor: '#138F2D' };

  const sBal = (updatedAccounts || []).find((a) => a.id === sourceTx?.account_id)?.balance;
  const dBal = (updatedAccounts || []).find((a) => a.id === destTx?.account_id)?.balance;

  return (
    <div className="mt-3 rounded-2xl bg-[#181826] border border-white/10 p-4 shadow-glass transition-all hover:border-white/20">
      <div className="flex items-center justify-between pb-3 border-b border-white/5">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-electric-violet/15 text-electric-violet flex items-center justify-center font-bold">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-electric-violet font-semibold uppercase tracking-wider">
              โอนเงินระหว่างบัญชี
            </div>
            <div className="font-semibold text-white text-base leading-tight">
              โอนเงินสำเร็จ
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-slate-400">ยอดที่โอน</div>
          <div className="text-lg font-bold text-white">
            ฿{formatCurrency(sourceTx?.amount)}
          </div>
        </div>
      </div>

      {/* Transfer Flow Visual */}
      <div className="py-4 flex items-center justify-between">
        {/* Source Account */}
        <div className="flex-1 bg-black/30 p-2.5 rounded-xl border border-white/5 text-center">
          <div className="text-[10px] text-slate-400 mb-1">จากบัญชี</div>
          <div
            className="text-xs font-bold truncate px-2 py-0.5 rounded-md inline-block"
            style={{ backgroundColor: `${sAcc.accentColor}25`, color: sAcc.accentColor }}
          >
            {sAcc.name}
          </div>
          {sBal !== undefined && (
            <div className="text-[10px] text-slate-400 mt-1">
              คงเหลือ: <span className="text-white font-medium">฿{formatCurrency(sBal)}</span>
            </div>
          )}
        </div>

        {/* Arrow */}
        <div className="px-2 flex flex-col items-center">
          <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-slate-400">
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        {/* Dest Account */}
        <div className="flex-1 bg-black/30 p-2.5 rounded-xl border border-white/5 text-center">
          <div className="text-[10px] text-slate-400 mb-1">ไปยังบัญชี</div>
          <div
            className="text-xs font-bold truncate px-2 py-0.5 rounded-md inline-block"
            style={{ backgroundColor: `${dAcc.accentColor}25`, color: dAcc.accentColor }}
          >
            {dAcc.name}
          </div>
          {dBal !== undefined && (
            <div className="text-[10px] text-slate-400 mt-1">
              คงเหลือ: <span className="text-white font-medium">฿{formatCurrency(dBal)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/5">
        <span className="flex items-center text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
          บันทึกคู่ธุรกรรมสำเร็จ
        </span>
        <span className="font-mono text-slate-500 text-[10px]">{pairId}</span>
      </div>
    </div>
  );
};
