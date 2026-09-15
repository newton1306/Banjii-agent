import React from 'react';
import { formatCurrency } from '../../lib/dateUtils';
import { ACCOUNT_MAP } from '../../types/constants';
import { Wallet, Users, ArrowUpRight, ShieldCheck } from 'lucide-react';

export const FinancialSummaryCard = ({ data }) => {
  if (!data) return null;
  const { accounts, totalBalance, totalFriendDebt, friendDebtList } = data;

  return (
    <div className="mt-3 rounded-2xl bg-[#181826] border border-white/10 p-4 shadow-glass transition-all hover:border-white/20">
      {/* Top Banner */}
      <div className="flex items-center justify-between pb-3 border-b border-white/5">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-neon-lime/15 text-neon-lime flex items-center justify-center font-bold">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-neon-lime font-semibold uppercase tracking-wider">
              สรุปภาพรวมการเงิน
            </div>
            <div className="font-semibold text-white text-base leading-tight">
              ยอดเงินและหนี้ค้าง
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-slate-400">เงินรวม 3 บัญชี</div>
          <div className="text-xl font-extrabold text-neon-lime">
            ฿{formatCurrency(totalBalance)}
          </div>
        </div>
      </div>

      {/* 3 Bank Cards */}
      <div className="grid grid-cols-3 gap-2 py-3 border-b border-white/5">
        {(accounts || []).map((acc) => {
          const info = { ...(ACCOUNT_MAP[acc.id] || {}), ...acc };
          return (
            <div
              key={acc.id}
              className="bg-black/35 rounded-xl p-2.5 border border-white/5 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: `${info.accentColor}25`, color: info.accentColor }}
                >
                  {acc.id.toUpperCase()}
                </span>
                <span className="text-[10px] text-slate-500">{info.mask || ''}</span>
              </div>

              <div className="mt-2">
                <div className="text-[10px] text-slate-400 truncate">{info.name}</div>
                <div className="text-xs font-bold text-white truncate">
                  ฿{formatCurrency(acc.balance)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Friends Debt List */}
      <div className="pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
            <Users className="w-3.5 h-3.5 text-neon-lime" />
            <span>เพื่อนค้างเงินเรา</span>
          </span>
          <span className="text-xs font-bold text-amber-400">
            รวม ฿{formatCurrency(totalFriendDebt)}
          </span>
        </div>

        {friendDebtList && friendDebtList.length > 0 ? (
          <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
            {friendDebtList.map((f, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-black/20 px-2.5 py-1.5 rounded-lg border border-white/5"
              >
                <div className="flex items-center space-x-2">
                  <img
                    src="/avatars/male-animated.svg"
                    alt={f.name}
                    className="w-5 h-5 rounded-full border border-blue-400/40 bg-slate-800"
                  />
                  <span className="text-xs text-slate-200 font-medium">{f.name}</span>
                </div>
                <span className="text-xs font-bold text-amber-400">
                  ฿{formatCurrency(f.amount)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-2 text-xs text-slate-400 flex items-center justify-center space-x-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>ไม่มีเพื่อนค้างเงินในระบบ</span>
          </div>
        )}
      </div>
    </div>
  );
};
