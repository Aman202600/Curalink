import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, User, Bot, Sparkles, MessageSquare } from 'lucide-react';
import StepLoader from './StepLoader';
import ResponseRenderer from './ResponseRenderer';

const ExampleChips = ({ onClick }) => {
  const chips = [
    "Latest immunotherapy for Lung Cancer",
    "Clinical trials for Type 2 Diabetes in London",
    "Effective treatments for Pediatric Asthma",
    "New research on Alzheimer's prevention"
  ];
  return (
    <div className="flex flex-wrap gap-2 mt-4 justify-center">
      {chips.map(chip => (
        <button
          key={chip}
          onClick={() => onClick(chip)}
          className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-full text-[11px] font-bold hover:border-teal-500 hover:text-teal-600 transition-all shadow-sm active:scale-95"
        >
          {chip}
        </button>
      ))}
    </div>
  );
};

const ChatWindow = ({ messages, onSendMessage, isLoading, currentStep }) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 lg:border-r border-slate-200 w-full">
      <div className="p-4 lg:p-6 border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-600 rounded-lg text-white shadow-lg shadow-teal-100">
              <Bot size={20} />
            </div>
            <div>
              <h1 className="text-xs lg:text-sm font-black text-slate-900 uppercase tracking-widest">CuraLink AI</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
                <p className="text-[9px] lg:text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Clinical Decision Support Active</p>
              </div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-100">
            <MessageSquare size={12} className="text-slate-400" />
            <span className="text-[10px] font-bold text-slate-500">{messages.filter(m => m.role === 'user').length} Queries</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 lg:p-10 space-y-8 lg:space-y-12 custom-scrollbar">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-8 py-10 lg:py-20">
            <div className="w-16 lg:w-20 h-16 lg:h-20 bg-teal-50 text-teal-600 rounded-2xl lg:rounded-3xl flex items-center justify-center shadow-inner rotate-3">
              <Sparkles size={32} className="lg:w-[40px] lg:h-[40px]" />
            </div>
            <div className="max-w-md px-4">
              <h2 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight leading-none mb-4">Precision Medical Intelligence.</h2>
              <p className="text-xs lg:text-sm text-slate-500 leading-relaxed font-medium mt-2">
                Analyze clinical outcomes, cross-reference treatments, and find active trials in seconds.
              </p>
            </div>
            <ExampleChips onClick={setInput} />
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} w-full`}>
             {msg.role === 'user' ? (
                <div className="max-w-[85%] lg:max-w-[80%] rounded-2xl px-4 lg:px-5 py-2.5 lg:py-3 bg-teal-600 text-white shadow-lg shadow-teal-100 font-medium text-xs lg:text-sm">
                  {msg.content}
                </div>
             ) : (
                <div className="w-full">
                  <div className="flex items-center gap-2 mb-4 lg:mb-6 opacity-40">
                    <Bot size={14} />
                    <span className="text-[9px] lg:text-[10px] font-bold uppercase tracking-[0.2em]">CuraLink Analysis</span>
                  </div>
                  <div className="w-full overflow-x-hidden">
                    <ResponseRenderer data={msg.content} />
                  </div>
                </div>
             )}
          </div>
        ))}

        {isLoading && (
          <div className="space-y-4 w-full">
            <div className="flex items-center gap-2 mb-4 opacity-40">
              <Bot size={14} className="animate-spin" />
              <span className="text-[9px] lg:text-[10px] font-bold uppercase tracking-[0.2em]">Processing Literature...</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl lg:rounded-3xl p-6 lg:p-8 shadow-sm w-full">
              <StepLoader currentStep={currentStep} />
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <div className="p-4 lg:p-6 bg-white border-t border-slate-200">
        <form onSubmit={handleSubmit} className="relative w-full max-w-3xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="Search treatments..."
            className="w-full pl-4 lg:pl-6 pr-12 lg:pr-14 py-3 lg:py-4 bg-slate-50 border border-slate-200 rounded-xl lg:rounded-2xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all text-xs lg:text-sm font-medium placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-1.5 lg:right-2.5 top-1.5 lg:top-2.5 p-2 lg:p-2.5 bg-teal-600 text-white rounded-lg lg:rounded-xl hover:bg-teal-700 disabled:opacity-50 disabled:bg-slate-400 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-teal-100"
          >
            <Send size={18} className="lg:w-[20px] lg:h-[20px]" />
          </button>
        </form>
        <p className="mt-4 text-[9px] lg:text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest">
           No Medical Advice Provided
        </p>
      </div>
    </div>
  );
};

export default ChatWindow;
