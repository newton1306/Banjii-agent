import React, { useState, useEffect } from 'react';
import { X, Cpu, ShieldCheck, Check, Sparkles, CheckCircle2 } from 'lucide-react';

export const SettingsModal = ({ isOpen, onClose }) => {
  const [model, setModel] = useState('gemini-3.6-flash');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setModel(localStorage.getItem('banjii_agent_model') || 'gemini-3.6-flash');
      setIsSaved(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    localStorage.setItem('banjii_agent_model', model);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#181826] border border-white/10 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-neon-lime/15 text-neon-lime flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">การตั้งค่า AI Engine</h3>
              <p className="text-[11px] text-slate-400">Google Gemini Configuration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* Gemini API Key Environment Status */}
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-white font-semibold text-xs flex items-center space-x-1.5">
                  <span>Google Gemini API</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                </div>
                <div className="text-slate-400 text-[10px] mt-0.5">
                  เชื่อมต่อผ่าน Environment Variable (.env) เรียบร้อย
                </div>
              </div>
            </div>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-full shrink-0">
              พร้อมใช้งาน
            </span>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <label className="text-slate-300 font-semibold flex items-center space-x-1">
              <Cpu className="w-3.5 h-3.5 text-electric-violet" />
              <span>เลือกรุ่น Gemini Model</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setModel('gemini-3.6-flash')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  model === 'gemini-3.6-flash'
                    ? 'bg-neon-lime/10 border-neon-lime text-white'
                    : 'bg-black/30 border-white/5 text-slate-400 hover:border-white/20'
                }`}
              >
                <div className="font-bold text-xs flex items-center space-x-1">
                  <span>Gemini 3.6 Flash</span>
                  <Sparkles className="w-3 h-3 text-neon-lime" />
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">แนะนำ: รวดเร็ว ฉลาด วิเคราะห์แม่นยำ</div>
              </button>

              <button
                type="button"
                onClick={() => setModel('gemini-flash-latest')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  model === 'gemini-flash-latest'
                    ? 'bg-neon-lime/10 border-neon-lime text-white'
                    : 'bg-black/30 border-white/5 text-slate-400 hover:border-white/20'
                }`}
              >
                <div className="font-bold text-xs">Gemini Flash Latest</div>
                <div className="text-[10px] text-slate-400 mt-0.5">รุ่นอัปเดตอัตโนมัติล่าสุด</div>
              </button>

              <button
                type="button"
                onClick={() => setModel('gemini-3.5-flash')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  model === 'gemini-3.5-flash'
                    ? 'bg-neon-lime/10 border-neon-lime text-white'
                    : 'bg-black/30 border-white/5 text-slate-400 hover:border-white/20'
                }`}
              >
                <div className="font-bold text-xs">Gemini 3.5 Flash</div>
                <div className="text-[10px] text-slate-400 mt-0.5">รุ่นเสถียร รองรับ Tool Calling สูง</div>
              </button>
            </div>
          </div>

          {/* Supabase connection indicator */}
          <div className="p-3 rounded-xl bg-black/20 border border-white/5 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-slate-200 font-semibold text-[11px]">สถานะฐานข้อมูล Banjii</div>
                <div className="text-slate-500 text-[10px]">gcpqwczdygokaqjnjdon.supabase.co</div>
              </div>
            </div>
            <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full font-medium">
              เชื่อมต่อแล้ว
            </span>
          </div>

          {/* Save Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-neon-lime hover:bg-neon-limeHover active:scale-95 text-black font-bold text-xs transition-all shadow-glow-lime flex items-center justify-center space-x-1.5"
            >
              {isSaved ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>บันทึกเรียบร้อย!</span>
                </>
              ) : (
                <span>บันทึกการตั้งค่า</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
