import React, { useEffect, useRef } from 'react';
import { ExpenseCard } from './cards/ExpenseCard';
import { SplitBillCard } from './cards/SplitBillCard';
import { TransferCard } from './cards/TransferCard';
import { RepaymentCard } from './cards/RepaymentCard';
import { FinancialSummaryCard } from './cards/FinancialSummaryCard';
import { RecentTransactionsCard } from './cards/RecentTransactionsCard';
import { Bot, User, Sparkles } from 'lucide-react';

export const ChatContainer = ({ messages = [], isLoading = false, updatedAccounts = [] }) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const renderToolCard = (msg) => {
    if (!msg.toolResult || !msg.toolResult.data) return null;
    const { tool, data } = msg.toolResult;

    switch (tool) {
      case 'add_transaction':
        return <ExpenseCard transaction={data.transaction} updatedAccounts={data.updatedAccounts} />;
      case 'create_split_bill':
        return <SplitBillCard data={data} />;
      case 'record_transfer':
        return <TransferCard data={data} />;
      case 'settle_friend_debt':
        return <RepaymentCard data={data} />;
      case 'get_financial_summary':
        return <FinancialSummaryCard data={data} />;
      case 'get_recent_transactions':
        return <RecentTransactionsCard transactions={data} />;
      default:
        return null;
    }
  };

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 max-w-3xl mx-auto w-full">
      {messages.length === 0 && (
        <div className="py-12 text-center space-y-4 max-w-md mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-electric-violet to-neon-lime mx-auto p-[2px] shadow-glow-violet">
            <div className="w-full h-full bg-[#181826] rounded-[14px] flex items-center justify-center text-neon-lime">
              <Bot className="w-7 h-7" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Banjii Financial AI Agent
            </h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              ผู้ช่วยจัดการเงินส่วนบุคคลและหารบิลอัจฉริยะ สั่งงานด้วยภาษาไทยธรรมชาติได้ทันที
            </p>
          </div>

          <div className="bg-[#181826]/70 border border-white/5 rounded-2xl p-3.5 text-left text-xs text-slate-300 space-y-2">
            <div className="font-semibold text-neon-lime flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>ตัวอย่างประโยคที่คุณสามารถสั่งได้:</span>
            </div>
            <p className="text-slate-400 italic">• "กินข้าวแกงกะหรี่ 180 จ่าย kbank"</p>
            <p className="text-slate-400 italic">• "จ่ายค่าคอร์ทแบด 995 ktb หารกับ Nine, Praew, Non คนละเท่าๆ กัน ส่วนเรา 70"</p>
            <p className="text-slate-400 italic">• "Non โอนคืน 150 เข้า kbank"</p>
            <p className="text-slate-400 italic">• "โอนเงินจาก ktb ไป kbank 500"</p>
            <p className="text-slate-400 italic">• "ตอนนี้เหลือเงินแต่ละบัญชีเท่าไหร่ และใครติดเงินเราบ้าง"</p>
          </div>
        </div>
      )}

      {messages.map((msg, index) => {
        const isUser = msg.sender === 'user';
        return (
          <div
            key={index}
            className={`flex items-start space-x-2.5 ${isUser ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            <div
              className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold ${
                isUser
                  ? 'bg-electric-violet text-white shadow-glow-violet'
                  : 'bg-[#181826] border border-white/10 text-neon-lime'
              }`}
            >
              {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            {/* Content Bubble */}
            <div className={`max-w-[85%] sm:max-w-[75%]`}>
              <div
                className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-line shadow-sm ${
                  isUser
                    ? 'bg-gradient-to-r from-electric-violet to-[#4b3ee8] text-white rounded-tr-none'
                    : 'bg-[#181826] border border-white/10 text-slate-200 rounded-tl-none'
                }`}
              >
                {msg.text}
              </div>

              {/* Render Rich Transaction Card if Agent triggered a tool */}
              {!isUser && renderToolCard(msg)}

              <div
                className={`text-[10px] text-slate-500 mt-1 px-1 ${
                  isUser ? 'text-right' : 'text-left'
                }`}
              >
                {msg.time}
              </div>
            </div>
          </div>
        );
      })}

      {/* Typing Indicator */}
      {isLoading && (
        <div className="flex items-start space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#181826] border border-white/10 text-neon-lime flex items-center justify-center">
            <Bot className="w-4 h-4 animate-pulse" />
          </div>
          <div className="bg-[#181826] border border-white/10 p-3 rounded-2xl rounded-tl-none flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-neon-lime animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-2 h-2 rounded-full bg-neon-lime animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-2 h-2 rounded-full bg-neon-lime animate-bounce"></span>
          </div>
        </div>
      )}
    </div>
  );
};
