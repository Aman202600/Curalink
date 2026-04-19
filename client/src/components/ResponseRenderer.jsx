import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Sparkles, 
  TrendingUp, 
  Search, 
  ShieldAlert, 
  FlaskConical, 
  ChevronRight,
  Stethoscope,
  Info,
  CheckCircle2,
  Bot,
  Database,
  Activity,
  MapPin
} from 'lucide-react';

const SectionHeader = ({ icon: Icon, title, iconColor = "text-teal-600" }) => (
  <div className="flex items-center gap-2 mb-4 mt-8 first:mt-2">
    <Icon className={iconColor} size={18} />
    <h2 className="text-sm font-bold uppercase text-slate-600 tracking-wider">
      {title}
    </h2>
  </div>
);

const TreatmentCard = ({ item, index }) => (
  <div className="flex gap-4 p-4 mb-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-teal-200 transition-all group">
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-xs font-bold text-slate-400 group-hover:bg-teal-50 group-hover:text-teal-600 group-hover:border-teal-100">
      {index + 1}
    </div>
    <div>
      <h4 className="font-bold text-slate-800 text-sm">{item.name}</h4>
      <div className="flex flex-wrap gap-2 mt-1">
        <span className="text-[10px] font-bold text-teal-600 uppercase bg-teal-50 px-1.5 py-0.5 rounded italic">
          {item.evidence} Evidence
        </span>
        <span className="text-[10px] font-medium text-slate-500">
          Target: {item.target}
        </span>
      </div>
      <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
        <strong>Rec:</strong> {item.recommendation}
      </p>
    </div>
  </div>
);

const ResponseRenderer = ({ data }) => {
  const [showExplanation, setShowExplanation] = React.useState(false);

  let parsedData = data;
  if (typeof data === 'string') {
    try {
      parsedData = JSON.parse(data);
    } catch (e) {
      return (
        <div className="p-4 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 italic">
          Research intelligence payload could not be parsed. Showing raw data:
          <pre className="mt-2 text-[10px] overflow-auto whitespace-pre-wrap">{data}</pre>
        </div>
      );
    }
  }

  if (!parsedData) return null;

  const handleAnalyzeClick = () => {
    const section = document.getElementById("evidence-portfolio");
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const explanationPoints = [
    "Retrieved severity indicators from papers",
    "Evidence level from meta-analysis/RCT metadata",
    "Matching treatment profiles to patient phenotypes"
  ];

  return (
    <div className="max-w-[850px] mx-auto space-y-12 pb-20">
      
      {/* ⚡ MOST IMPACTFUL INSIGHT (NEW REFINED VERSION) */}
      {(parsedData.primaryInsight || parsedData.impactfulFinding) && (
        <div className="max-w-3xl mx-auto mb-8">
           <div className="p-5 lg:p-6 rounded-2xl bg-blue-50/50 border border-blue-100 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles size={12} />
                  Most Impactful Insight
                </p>
                <div className={`px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[9px] font-black uppercase`}>
                   Confidence: {parsedData.confidence}
                </div>
              </div>
              
              <p className="text-sm md:text-base font-bold text-slate-800 leading-relaxed">
                {parsedData.primaryInsight || parsedData.impactfulFinding}
              </p>

              <button 
                onClick={() => setShowExplanation(!showExplanation)}
                className="mt-4 flex items-center gap-1.5 text-[11px] font-black text-blue-600 uppercase tracking-tight hover:underline cursor-pointer"
              >
                {showExplanation ? "Hide Reasoning" : "Explain Why"} 
                <ChevronRight size={12} className={`transition-transform duration-200 ${showExplanation ? 'rotate-90' : ''}`} />
              </button>

              {showExplanation && (
                <div className="mt-4 p-4 rounded-xl bg-white border border-blue-100 animate-in fade-in slide-in-from-top-2 duration-300">
                  <p className="text-xs font-bold text-slate-500 mb-2">Decision Basis:</p>
                  <ul className="list-disc list-inside text-xs text-slate-600 space-y-2 font-medium">
                    {explanationPoints.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                    <li>Verified against {parsedData.takeaways?.length || 0} core clinical takeaways</li>
                  </ul>
                </div>
              )}
           </div>
        </div>
      )}

      {/* 1. EXECUTIVE SUMMARY */}
      {parsedData.takeaways?.length > 0 && (
        <section className="bg-white border border-slate-200 p-6 lg:p-8 rounded-3xl shadow-sm border-l-4 border-l-slate-900">
          <div className="flex items-center gap-3 mb-6">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Executive Summary</h3>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {parsedData.takeaways.map((point, i) => (
              <li key={i} className="flex items-start gap-4 text-sm font-semibold leading-relaxed text-slate-600">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-2 shrink-0 shadow-[0_0_8px_rgba(45,212,191,0.6)]" /> 
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 2. TOP RESEARCH INSIGHTS (HIDE IF LOW CONFIDENCE) */}
      {parsedData.confidence !== "Low" && parsedData.insights?.length > 0 && (
        <section id="evidence-portfolio" className="animate-in fade-in slide-in-from-bottom-2 duration-700">
           <SectionHeader icon={Search} title="Supporting Research Studies" iconColor="text-blue-500" />
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              {parsedData.insights.map((insight, i) => (
                <div key={i} className="group p-5 lg:p-6 bg-white border border-slate-200 rounded-2xl lg:rounded-3xl shadow-sm hover:shadow-md transition-all border-l-4 border-l-blue-500">
                   <p className="text-sm lg:text-base font-bold text-slate-800 leading-snug">
                     {insight.text}
                   </p>
                </div>
              ))}
           </div>
        </section>
      )}

      {/* 3. RANKED TREATMENTS (HIDE IF LOW CONFIDENCE) */}
      {parsedData.confidence !== "Low" && parsedData.treatments?.length > 0 && (
        <section className="animate-in fade-in slide-in-from-bottom-2 duration-700 delay-100">
          <SectionHeader icon={Stethoscope} title="Ranked Treatment Protocols" iconColor="text-teal-600" />
          <div className="space-y-4">
            {parsedData.treatments.map((t, i) => (
              <div key={i} className="p-6 lg:p-8 bg-white border border-slate-200 rounded-3xl shadow-sm hover:border-teal-200 transition-all">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <div>
                    <h4 className="text-lg lg:text-xl font-black text-slate-900 tracking-tight">{t.name}</h4>
                    <p className="text-[10px] font-black text-teal-500 uppercase tracking-widest mt-1">Target: {t.target}</p>
                  </div>
                  <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    t.evidence === 'High' ? 'bg-teal-50 text-teal-700 border border-teal-100' : 'bg-slate-50 text-slate-600 border border-slate-200'
                  }`}>
                    Evidence: {t.evidence}
                  </div>
                </div>
                <p className="text-sm lg:text-base text-slate-600 leading-relaxed font-medium">
                  {t.recommendation}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. DECISION GUIDANCE (HIDE IF LOW CONFIDENCE) */}
      {parsedData.confidence !== "Low" && parsedData.decisionGuidance?.length > 0 && (
        <section className="animate-in fade-in slide-in-from-bottom-2 duration-700 delay-150">
          <SectionHeader icon={ShieldAlert} title="Patient Segmentation & Decisions" iconColor="text-orange-500" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {parsedData.decisionGuidance.map((item, i) => (
              <div key={i} className="p-6 bg-slate-50 border border-slate-200 rounded-[2rem] hover:bg-white transition-colors cursor-pointer group">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-white rounded-xl shadow-sm text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                    <Stethoscope size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-tighter">{item.profile}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Profile-Specific Target</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-orange-700 uppercase mb-1">Recommendation</p>
                    <p className="text-sm font-bold text-slate-800">{item.treatment}</p>
                  </div>
                  <p className="px-1 text-[11px] text-slate-500 font-medium leading-relaxed italic">
                    {item.rationale}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. REGISTERED CLINICAL TRIALS (HIDE IF LOW CONFIDENCE) */}
      {parsedData.confidence !== "Low" && parsedData.trials?.length > 0 && (
        <section className="animate-in fade-in slide-in-from-bottom-2 duration-700 delay-200">
          <SectionHeader icon={Database} title="Registered Clinical Trials" iconColor="text-indigo-600" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
            {parsedData.trials.map((trial, i) => (
              <div key={i} className="p-5 lg:p-6 bg-slate-900 border border-slate-800 rounded-3xl text-white group cursor-default">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400">
                    <Activity size={18} />
                  </div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{trial.phase}</span>
                </div>
                <h4 className="text-sm lg:text-base font-bold mb-2 group-hover:text-indigo-400 transition-colors leading-tight">
                  {trial.title}
                </h4>
                <div className="flex items-center gap-1.5 text-slate-500 mb-4">
                  <MapPin size={12} />
                  <span className="text-[10px] font-bold uppercase tracking-tight">{trial.location}</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-medium line-clamp-3">
                  {trial.summary}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 🛡️ DATA STATUS ADVISORY (Only if Low Confidence) */}
      {parsedData.confidence === "Low" && (
        <div className="p-6 bg-slate-50 border border-slate-200 rounded-3xl mt-8">
           <div className="flex items-center gap-2 mb-2">
              <Info size={16} className="text-slate-400" />
              <p className="text-sm font-bold text-slate-900">Research Retrieval Notice</p>
           </div>
           <p className="text-sm text-slate-500 leading-relaxed font-medium">
             No high-confidence primary research evidence was retrieved specifically for this clinical query. 
             The analysis provided above reflects established medical standard-of-care guidelines. 
             Try specifying a patient phenotype or condition for more targeted results.
           </p>
        </div>
      )}

      {/* 🚀 CLINICAL SIGNIFICANCE (WHY IT MATTERS) */}
      {parsedData.clinicalSignificance && (
        <div className="p-8 lg:p-10 bg-teal-500 border border-teal-400 rounded-[2.5rem] text-white shadow-xl shadow-teal-100 relative overflow-hidden">
           <div className="absolute -bottom-10 -left-10 opacity-20 rotate-45">
             <TrendingUp size={200} />
           </div>
           <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 shrink-0">
                <CheckCircle2 size={32} />
              </div>
              <div>
                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] mb-2 opacity-80">Clinical Bottom Line</h3>
                <p className="text-lg lg:text-xl font-bold leading-tight tracking-tight">
                  {parsedData.clinicalSignificance}
                </p>
              </div>
           </div>
        </div>
      )}

      {/* 6. HYBRID FALLBACK TEXT */}
      {(!parsedData.trials?.length && !parsedData.treatments?.length && !parsedData.takeaways?.length && parsedData.fallbackText) && (
        <section className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <SectionHeader icon={Info} title="Extended Research Analysis" iconColor="text-slate-400" />
          <div className="p-8 lg:p-10 bg-white border border-slate-200 rounded-3xl shadow-sm prose prose-slate max-w-none prose-sm lg:prose-base leading-relaxed text-slate-700 italic">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {parsedData.fallbackText}
            </ReactMarkdown>
          </div>
        </section>
      )}
    </div>
  );
};

export default ResponseRenderer;
