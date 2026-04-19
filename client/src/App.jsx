import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import ChatWindow from './components/ChatWindow';
import SourceCard from './components/SourceCard';
import { Info, Database, Layers, User } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE;

function App() {
  const [sessionId] = useState(() => localStorage.getItem('curalink_session') || uuidv4());
  const [messages, setMessages] = useState([]);
  const [sources, setSources] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState('');

  // Example state for disease and location
  const [userInfo, setUserInfo] = useState({ disease: 'General', location: 'Remote' });

  useEffect(() => {
    localStorage.setItem('curalink_session', sessionId);
  }, [sessionId]);

  const handleSendMessage = async (query) => {
    setIsLoading(true);
    setSources([]); // ⚡ RESET EVIDENCE: Clear stale data before each search
    setMessages(prev => [...prev, { role: 'user', content: query }]);

    // Simulate steps for the loader
    const steps = ['fetching', 'embedding', 'ranking', 'generating'];
    let stepIdx = 0;
    setCurrentStep(steps[0]);

    const stepInterval = setInterval(() => {
      if (stepIdx < steps.length - 2) { // Last step is handled by API return
        stepIdx++;
        setCurrentStep(steps[stepIdx]);
      }
    }, 2000);

    try {
      const response = await axios.post(`${API_BASE}/chat`, {
        query,
        disease: userInfo.disease,
        location: userInfo.location,
        sessionId
      });

      clearInterval(stepInterval);
      setCurrentStep('generating'); // Ensure we get to the last step

      setMessages(prev => [...prev, { role: 'assistant', content: response.data.answer }]);
      setSources(response.data.sources);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm sorry, I encountered an error while processing your request. Please check your connection and try again." }]);
    } finally {
      clearInterval(stepInterval);
      setIsLoading(false);
      setCurrentStep('');
    }
  };

  return (
    <div className="app-container flex flex-col lg:flex-row bg-white font-sans text-slate-900 h-screen overflow-hidden">
      {/* Sidebar / Chat Panel - Full width on mobile, Fixed on desktop */}
      <div className="w-full lg:w-[450px] xl:w-[500px] 2xl:w-[600px] h-[500px] lg:h-full shrink-0 border-b lg:border-r lg:border-b-0 border-slate-200 shadow-xl z-20 flex flex-col overflow-hidden">
        <ChatWindow
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          currentStep={currentStep}
        />
      </div>

      {/* Main Content / Source Panel */}
      <div className="flex-1 flex flex-col h-full bg-slate-50/50 overflow-hidden">
        <header className="h-16 lg:h-20 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-4 lg:px-8 shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-4 lg:gap-10">
            <div className="flex items-center gap-3">
              <div className="p-1.5 lg:p-2 bg-slate-100 rounded-lg lg:rounded-xl text-slate-600">
                <Database size={16} className="lg:w-[18px] lg:h-[18px]" />
              </div>
              <div>
                <span className="hidden sm:block text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-tight mb-0.5 whitespace-nowrap">Knowledge Base</span>
                <span className="block text-[11px] lg:text-[13px] font-bold text-slate-800 tracking-tight leading-tight whitespace-nowrap">Live Medical Index</span>
              </div>
            </div>

            <div className="hidden md:block h-10 w-px bg-slate-200"></div>

            <div className="hidden md:flex items-center gap-3">
              <div className="p-2 bg-teal-50 rounded-xl text-teal-600">
                <Layers size={18} />
              </div>
              <div>
                <span className="block text-[10px] font-black text-teal-400 uppercase tracking-[0.2em] leading-tight mb-0.5 whitespace-nowrap">Retrieval Depth</span>
                <span className="block text-[13px] font-bold text-teal-800 tracking-tight leading-tight whitespace-nowrap">{sources.length} Active Citations</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-4">
            <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 lg:px-4 py-1.5 lg:py-2 rounded-xl lg:rounded-2xl shadow-sm">
              <div className="w-1.5 lg:w-2 h-1.5 lg:h-2 rounded-full bg-teal-500 animate-pulse"></div>
              <span className="text-[9px] lg:text-[11px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap uppercase">Active</span>
            </div>
            <div className="w-8 lg:w-10 h-8 lg:h-10 rounded-xl lg:rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors cursor-pointer">
              <User size={16} className="lg:w-[20px] lg:h-[20px]" />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-10 custom-scrollbar">
          {sources.length > 0 ? (
            <div className="relative">
              <div className="mb-6 lg:mb-8 max-w-6xl mx-auto flex items-center justify-between">
                <h2 className="text-[10px] lg:text-sm font-black text-slate-400 uppercase tracking-[0.3em]">Retrieved Evidence</h2>
                <div className="h-px flex-1 mx-4 lg:mx-6 bg-slate-100"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4 lg:gap-6 max-w-[1600px] mx-auto pb-20">
                {sources.map((source, idx) => (
                  <SourceCard key={idx} source={source} index={idx} />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 lg:py-20 animate-in fade-in duration-700">
              <div className="w-16 lg:w-24 h-16 lg:h-24 bg-white border-2 border-dashed border-slate-200 rounded-2xl lg:rounded-3xl flex items-center justify-center text-slate-200 mb-6 lg:mb-8 shadow-inner">
                <Database size={32} className="lg:w-[48px] lg:h-[48px]" />
              </div>
              <h3 className="text-xl lg:text-2xl font-black text-slate-800 tracking-tight">No Active Retrieval</h3>
              <p className="text-xs lg:text-sm text-slate-400 max-w-sm mt-3 font-medium leading-relaxed">
                Connect to the global medical infrastructure by querying the assistant.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
