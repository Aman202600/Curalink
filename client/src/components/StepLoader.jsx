import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, Database, BrainCircuit, CheckCircle2 } from 'lucide-react';

const steps = [
  { id: 'fetching', label: 'Fetching PubMed, OpenAlex & Trials...', icon: Search },
  { id: 'embedding', label: 'Processing & Indexing Research...', icon: Database },
  { id: 'ranking', label: 'Semantic Ranking (RAG)...', icon: BrainCircuit },
  { id: 'generating', label: 'Generating Medical Insights...', icon: Loader2 }
];

const StepLoader = ({ currentStep }) => {
  const stepIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="flex flex-col gap-4 p-6 bg-slate-50 rounded-xl border border-slate-200">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isActive = index === stepIndex;
        const isCompleted = index < stepIndex;

        return (
          <div key={step.id} className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              isCompleted ? 'bg-teal-100 text-teal-600' :
              isActive ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-400'
            }`}>
              {isCompleted ? <CheckCircle2 size={18} /> : 
               isActive ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}><Icon size={18} /></motion.div> :
               <Icon size={18} />}
            </div>
            <span className={`text-sm font-medium ${
              isActive ? 'text-teal-900' : 
              isCompleted ? 'text-teal-600' : 'text-slate-400'
            }`}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default StepLoader;
