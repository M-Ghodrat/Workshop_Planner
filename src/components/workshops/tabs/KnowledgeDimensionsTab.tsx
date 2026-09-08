import React from 'react';
import { Sparkles, Info, Award, HelpCircle, CheckCircle2 } from 'lucide-react';
import {
  Workshop,
  DimensionsOfKnowledge,
  DimensionRating,
} from '../../../types';

interface KnowledgeDimensionsTabProps {
  workshop: Workshop;
  setWorkshop: React.Dispatch<React.SetStateAction<Workshop>>;
}

const RATING_OPTIONS: {
  value: DimensionRating;
  label: string;
  shortLabel: string;
  badgeColor: string;
  description: string;
}[] = [
  {
    value: 'i',
    label: 'Introduced',
    shortLabel: 'i',
    badgeColor: 'bg-sky-50 text-sky-800 border-sky-300',
    description: 'Concepts and foundational frameworks presented for the first time.',
  },
  {
    value: 'r',
    label: 'Reinforced',
    shortLabel: 'r',
    badgeColor: 'bg-indigo-50 text-indigo-800 border-indigo-300',
    description: 'Knowledge and skills built upon, deepened, and practiced.',
  },
  {
    value: 'm',
    label: 'Mastered',
    shortLabel: 'm',
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    description: 'Comprehensive proficiency, independent application, and synthesis.',
  },
  {
    value: 'i**',
    label: 'Introduced (Strong Emphasis)',
    shortLabel: 'i**',
    badgeColor: 'bg-sky-100 text-sky-950 border-sky-400 font-extrabold',
    description: 'Primary intensive introduction with dedicated labs and focus.',
  },
  {
    value: 'r**',
    label: 'Reinforced (Strong Emphasis)',
    shortLabel: 'r**',
    badgeColor: 'bg-indigo-100 text-indigo-950 border-indigo-400 font-extrabold',
    description: 'Heavy reinforcement with core evaluative case analysis.',
  },
  {
    value: 'm**',
    label: 'Mastered (Strong Emphasis)',
    shortLabel: 'm**',
    badgeColor: 'bg-emerald-100 text-emerald-950 border-emerald-400 font-extrabold',
    description: 'Peak mastery evaluated via executive-level deliverables.',
  },
  {
    value: 'NA',
    label: 'Not Applicable',
    shortLabel: 'NA',
    badgeColor: 'bg-slate-100 text-slate-500 border-slate-200',
    description: 'Not targeted as a primary assessment area in this workshop.',
  },
];

const DIMENSION_DEFINITIONS = [
  {
    key: 'depthAndBreadth' as keyof DimensionsOfKnowledge,
    title: '1. Depth & Breadth of Knowledge',
    description:
      'Understanding of key theories, current concepts, specialized knowledge, and cross-disciplinary scope in the discipline.',
  },
  {
    key: 'methodologiesAndResearch' as keyof DimensionsOfKnowledge,
    title: '2. Methodologies & Research',
    description:
      'Comprehension of research methods, statistical inquiry, critical analysis techniques, and evidence evaluation.',
  },
  {
    key: 'applicationOfKnowledge' as keyof DimensionsOfKnowledge,
    title: '3. Application of Knowledge',
    description:
      'Practical utilization of concepts, tools, frameworks, and problem-solving strategies in simulated or real business contexts.',
  },
  {
    key: 'communicationSkills' as keyof DimensionsOfKnowledge,
    title: '4. Communication Skills',
    description:
      'Ability to articulate ideas, present analytical findings, debate arguments, and structure written/oral deliverables.',
  },
  {
    key: 'awarenessOfLimits' as keyof DimensionsOfKnowledge,
    title: '5. Awareness of Limits',
    description:
      'Recognition of the boundaries of current knowledge, ethical risks, algorithmic limitations, and areas of uncertainty.',
  },
  {
    key: 'professionalCapacity' as keyof DimensionsOfKnowledge,
    title: '6. Professional Capacity',
    description:
      'Autonomous decision-making, ethical leadership, team collaboration, and professional accountability in enterprise settings.',
  },
];

export const KnowledgeDimensionsTab: React.FC<KnowledgeDimensionsTabProps> = ({
  workshop,
  setWorkshop,
}) => {
  const currentDims = workshop.dimensionsOfKnowledge || {};

  const handleUpdate = (key: keyof DimensionsOfKnowledge, val: DimensionRating | '') => {
    setWorkshop((prev) => {
      const nextDims = { ...(prev.dimensionsOfKnowledge || {}) };
      if (!val) {
        delete nextDims[key];
      } else {
        nextDims[key] = val as DimensionRating;
      }
      return {
        ...prev,
        dimensionsOfKnowledge: nextDims,
      };
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-[#002B49]" />
          <h3 className="text-base font-bold text-slate-900">
            UCW Dimensions of Knowledge Matrix
          </h3>
        </div>
        <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
          Rate the pedagogical depth targeted for each of the six core University Canada West
          degree-level knowledge dimensions. This informs institutional accreditation, curriculum
          mapping, and quality assurance.
        </p>
      </div>

      {/* 6 Dimensions Grid (2 rows x 3 columns on desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {DIMENSION_DEFINITIONS.map((dim, idx) => {
          const selectedRating = currentDims[dim.key] || '';
          const ratingObj = RATING_OPTIONS.find((r) => r.value === selectedRating);

          return (
            <div
              key={dim.key}
              className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 p-5 shadow-2xs flex flex-col justify-between space-y-4 transition-all"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                    0{idx + 1}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                      ratingObj ? ratingObj.badgeColor : 'bg-slate-100 text-slate-400 border-dashed border-slate-300'
                    }`}
                  >
                    {ratingObj ? `Rating: ${selectedRating}` : 'Not Set'}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 leading-snug">{dim.title}</h4>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  {dim.description}
                </p>
              </div>

              {/* Selector */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Accreditation Level:
                  </label>
                  <span className="text-[10px] font-bold text-slate-400">
                    {ratingObj ? ratingObj.label : 'Select rating below'}
                  </span>
                </div>

                <select
                  value={selectedRating}
                  onChange={(e) => handleUpdate(dim.key, e.target.value as DimensionRating)}
                  className={`w-full px-3 py-2 text-xs font-bold rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 cursor-pointer shadow-2xs transition-all ${
                    ratingObj ? ratingObj.badgeColor : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  <option value="" className="bg-white text-slate-400 font-normal">
                    -- Select Rating (Not Set) --
                  </option>
                  {RATING_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-white text-slate-900 font-semibold">
                      {opt.value} — {opt.label}
                    </option>
                  ))}
                </select>

                <div className="text-[11px] text-slate-500 leading-tight italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                  {ratingObj ? ratingObj.description : 'Choose an accreditation rating level from the dropdown to calibrate this dimension.'}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Explanatory Legend Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-sky-600" />
          Dimension Rating Scale & Accreditation Legend
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {RATING_OPTIONS.map((opt) => (
            <div
              key={opt.value}
              className={`p-3 rounded-xl border text-xs flex flex-col justify-between ${opt.badgeColor}`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-sm">{opt.value}</span>
                  <span className="text-[10px] font-bold uppercase">{opt.label}</span>
                </div>
                <p className="text-[11px] opacity-90 leading-snug">{opt.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
