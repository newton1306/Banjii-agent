import React from 'react';
import { formatCurrency } from '../lib/dateUtils';
import { ACCOUNT_MAP } from '../types/constants';
import { Settings, Sparkles, Activity, ShieldCheck } from 'lucide-react';

export const Header = ({ accounts = [], onOpenSettings }) => {
  return (
    <header className="sticky top-0 z-30 bg-[#0A0A12]/90 backdrop-blur-md border-b border-white/10 px-4 py-3">
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-electric-violet to-neon-lime p-[1.5px] flex items-center justify-center shadow-glow-lime">
            <div className="w-full h-full bg-[#0A0A12] rounded-[10px] flex items-center justify-center">
              <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-neon-lime to-electric-violet text-sm">
                BJ
              </span>
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-white text-base tracking-tight">Banjii AI</span>
              <span className="bg-neon-lime/15 text-neon-lime text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center space-x-0.5">
                <Sparkles className="w-2.5 h-2.5 mr-0.5" /> Agent
              </span>
            </div>
            <div className="flex items-center space-x-1.5 text-[10px] text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Supabase Live DB</span>
            </div>
          </div>
        </div>

        {/* 3 Bank Mini Balance Pill */}
        <div className="hidden sm:flex items-center space-x-1.5 bg-[#181826] px-2.5 py-1.5 rounded-xl border border-white/10 text-[11px]">
          {(accounts || []).map((acc) => {
            const info = ACCOUNT_MAP[acc.id] || acc;
            return (
              <div key={acc.id} className="flex items-center space-x-1 px-1.5 border-r border-white/5 last:border-0">
                <span className="font-bold uppercase text-[10px]" style={{ color: info.accentColor }}>
                  {acc.id}:
                </span>
                <span className="font-semibold text-slate-200">
                  ฿{formatCurrency(acc.balance)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          className="w-9 h-9 rounded-xl bg-[#181826] border border-white/10 hover:border-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-all active:scale-95"
          title="ตั้งค่า AI API Key"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Mobile Bank Quick Bar */}
      <div className="sm:hidden flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-[11px] overflow-x-auto no-scrollbar">
        {(accounts || []).map((acc) => {
          const info = ACCOUNT_MAP[acc.id] || acc;
          return (
            <div key={acc.id} className="flex items-center space-x-1 px-1.5 shrink-0">
              <span className="font-bold uppercase text-[10px]" style={{ color: info.accentColor }}>
                {acc.id}:
              </span>
              <span className="font-semibold text-slate-200">
                ฿{formatCurrency(acc.balance)}
              </span>
            </div>
          );
        })}
      </div>
    </header>
  );
};
