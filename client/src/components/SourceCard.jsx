import React from 'react';
import { ExternalLink, Calendar, Users, FlaskConical, MapPin, Award, CheckCircle } from 'lucide-react';

const SourceCard = ({ source, index }) => {
  const isTrial = source.source === 'clinicaltrials';
  
  // Evidence level styling logic
  const evidenceStyles = {
    'high': 'bg-teal-50 text-teal-700 border-teal-100 ring-teal-500/10',
    'medium': 'bg-blue-50 text-blue-700 border-blue-100 ring-blue-500/10',
    'low': 'bg-slate-50 text-slate-600 border-slate-100 ring-slate-400/10',
    'none': 'bg-slate-50 text-slate-500 border-slate-100'
  };
  
  const level = (source.evidenceLevel || 'none').toLowerCase();
  const currentEvidenceStyle = evidenceStyles[level] || evidenceStyles.none;

  return (
    <div className="group bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:border-teal-200 transition-all duration-300 flex flex-col h-full relative overflow-hidden">
      {/* Evidence Badge Overlay */}
      {source.evidenceLevel && (
        <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl border-l border-b text-[10px] font-black uppercase tracking-widest ${currentEvidenceStyle}`}>
          {source.evidenceLevel} Evidence
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 bg-slate-50 rounded-lg group-hover:bg-teal-50 transition-colors">
          {isTrial ? <FlaskConical size={14} className="text-orange-600" /> : <Award size={14} className="text-teal-600" />}
        </div>
        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
           {source.source} • [REF {index + 1}]
        </span>
      </div>

      <h3 className="font-bold text-slate-900 text-[15px] mb-3 leading-tight group-hover:text-teal-700 transition-colors">
        {source.title}
      </h3>

      <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4">
        {source.year && (
          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold">
            <Calendar size={12} className="text-slate-400" />
            {source.year}
          </div>
        )}
        <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold">
          <Users size={12} className="text-slate-400" />
          <span className="truncate max-w-[120px]">
            {source.authors?.length > 0 ? source.authors[0] + (source.authors.length > 1 ? ' et al.' : '') : 'N/A'}
          </span>
        </div>
        {isTrial && source.location && (
          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold">
            <MapPin size={12} className="text-slate-400" />
            <span className="truncate max-w-[100px]">{source.location}</span>
          </div>
        )}
      </div>

      <div className="relative flex-1">
        <p className="text-slate-600 text-xs leading-relaxed mb-6 line-clamp-3 font-medium">
          {source.abstract || 'Primary data and findings from clinical literature. Abstract not provided but source is indexed for relevance.'}
        </p>
      </div>

      <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
        {isTrial && source.status && (
          <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-tighter px-2 py-1 rounded bg-orange-50 text-orange-700 border border-orange-100">
             {source.status}
          </div>
        )}
        {!isTrial && source.studyType && (
          <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-tighter px-2 py-1 rounded bg-teal-50 text-teal-700 border border-teal-100">
             {source.studyType}
          </div>
        )}
        
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-teal-600 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-slate-200"
        >
          Source
          <ExternalLink size={12} />
        </a>
      </div>
    </div>
  );
};

export default SourceCard;
