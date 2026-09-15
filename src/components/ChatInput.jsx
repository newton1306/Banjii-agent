import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff } from 'lucide-react';

export const ChatInput = ({ onSendMessage, disabled = false, prefillPrompt = '' }) => {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (prefillPrompt) {
      const textVal = typeof prefillPrompt === 'object' ? prefillPrompt.text : prefillPrompt;
      if (textVal) {
        setInput(textVal);
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }
    }
  }, [prefillPrompt]);

  // Setup Web Speech API for Thai voice input
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'th-TH';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
        setIsListening(false);
      };

      recognition.onerror = (e) => {
        console.warn('Speech recognition error:', e);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListen = () => {
    if (!recognitionRef.current) {
      alert('เบราว์เซอร์นี้ไม่รองรับการสั่งงานด้วยเสียง (Speech Recognition)');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error('Failed to start speech:', e);
      }
    }
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || disabled) return;

    onSendMessage(trimmed);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom,12px))] bg-[#0A0A12]/95 border-t border-white/5 backdrop-blur-xl"
    >
      <div className="max-w-3xl mx-auto flex items-center space-x-2">
        {/* Voice Button */}
        <button
          type="button"
          onClick={toggleListen}
          className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl shrink-0 flex items-center justify-center transition-all ${
            isListening
              ? 'bg-rose-500/20 border border-rose-500/60 text-rose-400 animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.3)]'
              : 'bg-[#181826] border border-white/10 text-slate-400 hover:text-white hover:border-white/20 active:scale-90'
          }`}
          title={isListening ? 'กำลังฟังเสียง...' : 'สั่งงานด้วยเสียง (ไทย)'}
        >
          {isListening ? <MicOff className="w-4 h-4 text-rose-400" /> : <Mic className="w-4 h-4" />}
        </button>

        {/* Cohesive Input Pill */}
        <div className="flex-1 relative flex items-center bg-[#181826] border border-white/10 focus-within:border-neon-lime/60 focus-within:ring-2 focus-within:ring-neon-lime/20 rounded-2xl px-3.5 py-1.5 transition-all shadow-inner">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              // Ensure smooth positioning when keyboard appears without jump
              setTimeout(() => {
                window.scrollTo(0, 0);
              }, 150);
            }}
            disabled={disabled}
            placeholder={
              isListening
                ? 'กำลังฟังเสียงพูดภาษาไทย...'
                : 'พิมพ์สั่ง AI เช่น "กินข้าว 150 kbank"...'
            }
            className="w-full bg-transparent border-none text-[16px] sm:text-sm text-white placeholder:text-slate-500 py-1.5 outline-none font-normal"
          />
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={!input.trim() || disabled}
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl shrink-0 bg-neon-lime hover:bg-neon-limeHover active:scale-95 text-black font-bold flex items-center justify-center transition-all shadow-glow-lime disabled:opacity-30 disabled:shadow-none disabled:cursor-not-allowed disabled:bg-white/5 disabled:text-slate-500"
        >
          <Send className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>
    </form>
  );
};
