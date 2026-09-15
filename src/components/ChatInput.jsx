import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Sparkles } from 'lucide-react';

export const ChatInput = ({ onSendMessage, disabled = false, prefillPrompt = '' }) => {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (prefillPrompt) {
      setInput(prefillPrompt);
      if (inputRef.current) {
        inputRef.current.focus();
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
      className="p-3 bg-[#0A0A12]/90 border-t border-white/10 backdrop-blur-md"
    >
      <div className="max-w-3xl mx-auto flex items-center space-x-2">
        {/* Voice Button */}
        <button
          type="button"
          onClick={toggleListen}
          className={`w-11 h-11 rounded-xl shrink-0 flex items-center justify-center transition-all ${
            isListening
              ? 'bg-rose-500 text-white animate-pulse shadow-lg'
              : 'bg-[#181826] border border-white/10 text-slate-300 hover:text-white hover:border-white/20'
          }`}
          title={isListening ? 'กำลังฟังเสียง...' : 'สั่งงานด้วยเสียง (ไทย)'}
        >
          {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Text Input */}
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={
              isListening
                ? 'กำลังฟังเสียงพูดภาษาไทย...'
                : 'สั่งงาน AI เช่น "กินข้าว 150 kbank" หรือ "หารบิล..."'
            }
            className="w-full bg-[#181826] border border-white/10 focus:border-neon-lime/60 focus:ring-1 focus:ring-neon-lime/40 text-slate-100 placeholder-slate-500 text-xs sm:text-sm rounded-xl px-4 py-3 outline-none transition-all"
          />
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={!input.trim() || disabled}
          className="w-11 h-11 rounded-xl shrink-0 bg-neon-lime hover:bg-neon-limeHover active:scale-95 text-black font-bold flex items-center justify-center transition-all shadow-glow-lime disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </form>
  );
};
