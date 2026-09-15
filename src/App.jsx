import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { ChatContainer } from './components/ChatContainer';
import { QuickPromptChips } from './components/QuickPromptChips';
import { ChatInput } from './components/ChatInput';
import { SettingsModal } from './components/SettingsModal';
import { GeminiAgentClient } from './lib/geminiClient';
import { DatabaseService } from './lib/databaseService';
import { getBangkokTimeString } from './lib/dateUtils';

export function App() {
  const [messages, setMessages] = useState(() => {
    return [
      {
        sender: 'agent',
        text: 'สวัสดีครับ! ผมคือ Banjii Conversational Financial AI Agent ผู้ช่วยจัดการเงินของคุณ 🤖💳\nคุณสามารถพิมพ์สั่งงานด้วยภาษาไทยได้เลย เช่น บันทึกรายจ่าย, หารบิลกับเพื่อน, โอนเงินข้ามบัญชี หรือสอบถามยอดเงินคงเหลือครับ',
        time: getBangkokTimeString(),
        toolResult: null,
        engine: 'Banjii AI System',
      },
    ];
  });

  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [prefillPrompt, setPrefillPrompt] = useState(null);
  const [viewportHeight, setViewportHeight] = useState('100%');

  // Dynamically adapt to mobile virtual keyboard via visualViewport
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const handleResize = () => {
      const currentHeight = window.visualViewport.height;
      setViewportHeight(`${currentHeight}px`);
      window.scrollTo(0, 0);
    };

    window.visualViewport.addEventListener('resize', handleResize);
    window.visualViewport.addEventListener('scroll', handleResize);
    handleResize();

    return () => {
      window.visualViewport.removeEventListener('resize', handleResize);
      window.visualViewport.removeEventListener('scroll', handleResize);
    };
  }, []);

  // Fetch initial live accounts from Supabase
  const loadAccounts = useCallback(async () => {
    try {
      const data = await DatabaseService.getAccounts();
      setAccounts(data);
    } catch (e) {
      console.error('Failed to load accounts in App:', e);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleSendMessage = async (text) => {
    const userTime = getBangkokTimeString();
    const newMsgList = [
      ...messages,
      {
        sender: 'user',
        text,
        time: userTime,
      },
    ];
    setMessages(newMsgList);
    setIsLoading(true);

    try {
      const result = await GeminiAgentClient.processMessage(text);
      const agentTime = getBangkokTimeString();

      // If tool returned updated accounts, update state immediately
      if (result.data?.updatedAccounts) {
        setAccounts(result.data.updatedAccounts);
      } else {
        loadAccounts();
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: 'agent',
          text: result.formattedReply || 'บันทึกรายการเรียบร้อยแล้วครับ',
          time: agentTime,
          toolResult: result,
          engine: result.engine || 'Built-in Thai NLP',
        },
      ]);
    } catch (err) {
      console.error('Error processing message in App:', err);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'agent',
          text: `⚠️ เกิดข้อผิดพลาดในการประมวลผล: ${err.message}`,
          time: getBangkokTimeString(),
          toolResult: null,
          engine: 'System Alert',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectQuickPrompt = (prompt) => {
    // Populate into chat input instead of auto-sending
    setPrefillPrompt({ text: prompt, ts: Date.now() });
  };

  return (
    <div
      style={{ height: viewportHeight }}
      className="flex flex-col w-full bg-[#0A0A12] text-slate-100 antialiased overflow-hidden select-none fixed inset-0 transition-[height] duration-75 ease-out"
    >
      {/* Top Header with live bank badges */}
      <Header
        accounts={accounts}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Chat Thread Area */}
      <main className="flex-1 flex flex-col min-h-0 relative">
        <ChatContainer
          messages={messages}
          isLoading={isLoading}
          updatedAccounts={accounts}
        />

        {/* Quick Action Prompt Chips */}
        <div className="border-t border-white/5 bg-[#0A0A12]/80 backdrop-blur-sm">
          <QuickPromptChips
            onSelectPrompt={handleSelectQuickPrompt}
            disabled={isLoading}
          />
        </div>

        {/* Bottom Chat Input Bar */}
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={isLoading}
          prefillPrompt={prefillPrompt}
        />
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}

export default App;
