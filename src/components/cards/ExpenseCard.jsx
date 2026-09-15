import React from 'react';
import { formatCurrency, formatThaiDatePretty } from '../../lib/dateUtils';
import { ACCOUNT_MAP, CATEGORY_MAP } from '../../types/constants';
import { ArrowDownRight, ArrowUpRight, Calendar, CreditCard, Tag } from 'lucide-react';

export const ExpenseCard = ({ transaction, updatedAccounts }) => {
  if (!transaction) return null;

  const isExpense = transaction.type === 'expense';
  const acc = ACCOUNT_MAP[transaction.account_id] || { name: transaction.account_id, accentColor: '#138F2D' };
  const cat = CATEGORY_MAP[transaction.category] || { name: transaction.category, color: '#94A3B8' };
  const currentAcc = (updatedAccounts || []).find((a) => a.id === transaction.account_id);

  return (
    <div className="mt-3 rounded-2xl bg-[#181826] border border-white/10 p-4 shadow-glass transition-all hover:border-white/20">
      <div className="flex items-center justify-between pb-3 border-b border-white/5">
        <div className="flex items-center space-x-2.5">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              isExpense ? 'bg-rose-500/15 text-rose-400' : 'bg-emerald-500/15 text-emerald-400'
            }`}
          >
            {isExpense ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
              {isExpense ? 'รายจ่าย' : 'รายรับ'}
            </div>
            <div className="font-semibold text-white text-base leading-tight">
              {transaction.title}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className={`text-lg font-bold ${isExpense ? 'text-rose-400' : 'text-emerald-400'}`}>
            {isExpense ? '-' : '+'}฿{formatCurrency(transaction.amount)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 pt-3 text-xs">
        <div className="flex items-center space-x-2 text-slate-300">
          <CreditCard className="w-3.5 h-3.5 text-slate-400" />
          <span>บัญชี:</span>
          <span
            className="px-2 py-0.5 rounded-full font-medium text-[11px]"
            style={{ backgroundColor: `${acc.accentColor}25`, color: acc.accentColor }}
          >
            {acc.name}
          </span>
        </div>

        <div className="flex items-center space-x-2 text-slate-300">
          <Tag className="w-3.5 h-3.5 text-slate-400" />
          <span>หมวดหมู่:</span>
          <span className="text-slate-200 font-medium">{cat.name}</span>
        </div>

        <div className="flex items-center space-x-2 text-slate-400 col-span-2">
          <Calendar className="w-3.5 h-3.5" />
          <span>{formatThaiDatePretty(transaction.date)}</span>
          {currentAcc && (
            <span className="ml-auto text-slate-300">
              คงเหลือ: <span className="font-semibold text-white">฿{formatCurrency(currentAcc.balance)}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
