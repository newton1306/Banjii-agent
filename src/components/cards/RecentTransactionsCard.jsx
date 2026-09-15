import React from 'react';
import { formatCurrency, formatThaiDatePretty } from '../../lib/dateUtils';
import { ACCOUNT_MAP } from '../../types/constants';
import { History, ArrowDownRight, ArrowUpRight, ArrowLeftRight } from 'lucide-react';

export const RecentTransactionsCard = ({ transactions = [] }) => {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="mt-3 rounded-2xl bg-[#181826] border border-white/10 p-4 text-center text-xs text-slate-400">
        ยังไม่มีประวัติรายการล่าสุดในระบบ
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-2xl bg-[#181826] border border-white/10 p-4 shadow-glass transition-all hover:border-white/20">
      <div className="flex items-center space-x-2 pb-3 border-b border-white/5">
        <History className="w-4 h-4 text-neon-lime" />
        <span className="text-xs font-bold text-white uppercase tracking-wider">
          ประวัติรายการล่าสุด ({transactions.length})
        </span>
      </div>

      <div className="divide-y divide-white/5 mt-2">
        {transactions.map((tx) => {
          const isExp = tx.type === 'expense' || tx.type === 'transfer_out';
          const isTransfer = tx.type === 'transfer_out' || tx.type === 'transfer_in';
          const acc = ACCOUNT_MAP[tx.account_id];

          return (
            <div key={tx.id} className="py-2.5 flex items-center justify-between first:pt-1 last:pb-1">
              <div className="flex items-center space-x-2.5">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${
                    isTransfer
                      ? 'bg-electric-violet/15 text-electric-violet'
                      : isExp
                      ? 'bg-rose-500/15 text-rose-400'
                      : 'bg-emerald-500/15 text-emerald-400'
                  }`}
                >
                  {isTransfer ? (
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                  ) : isExp ? (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  )}
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-100 line-clamp-1">
                    {tx.title}
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center space-x-1.5">
                    <span>{formatThaiDatePretty(tx.date)}</span>
                    <span>•</span>
                    <span style={{ color: acc?.accentColor || '#fff' }}>
                      {acc?.name || tx.account_id}
                    </span>
                  </div>
                </div>
              </div>

              <div
                className={`text-xs font-bold ${
                  isExp ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {isExp ? '-' : '+'}฿{formatCurrency(tx.amount)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
