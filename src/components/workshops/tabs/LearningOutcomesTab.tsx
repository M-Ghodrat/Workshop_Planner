import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  GraduationCap,
} from 'lucide-react';
import { Workshop, LearningOutcome, BloomsTaxonomy } from '../../../types';

interface LearningOutcomesTabProps {
  workshop: Workshop;
  setWorkshop: React.Dispatch<React.SetStateAction<Workshop>>;
}

const BLOOM_LEVELS: {
  level: BloomsTaxonomy;
  color: string;
  badge: string;
  description: string;
  verbs: string;
}[] = [
  {
    level: 'Remember',
    color: 'bg-slate-100 text-slate-800 border-slate-300',
    badge: 'Level 1: Recall facts & basic concepts',
    description: 'Retrieve relevant knowledge from long-term memory.',
    verbs: 'define, duplicate, list, memorize, repeat, state',
  },
  {
    level: 'Understand',
    color: 'bg-sky-100 text-sky-800 border-sky-300',
    badge: 'Level 2: Explain ideas or concepts',
    description: 'Construct meaning from instructional messages and diagrams.',
    verbs: 'classify, describe, discuss, explain, identify, locate, recognize, report',
  },
  {
    level: 'Apply',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    badge: 'Level 3: Use information in new situations',
    description: 'Execute or implement a procedure in a given situation.',
    verbs: 'execute, implement, solve, use, demonstrate, interpret, operate, schedule',
  },
  {
    level: 'Analyze',
    color: 'bg-amber-100 text-amber-800 border-amber-300',
    badge: 'Level 4: Draw connections among ideas',
    description: 'Break material into constituent parts and determine how parts relate.',
    verbs: 'differentiate, organize, relate, compare, contrast, distinguish, examine',
  },
  {
    level: 'Evaluate',
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    badge: 'Level 5: Justify a stand or decision',
    description: 'Make judgments based on criteria and standards.',
    verbs: 'appraise, argue, defend, judge, select, support, value, critique, weigh',
  },
  {
    level: 'Create',
    color: 'bg-rose-100 text-rose-800 border-rose-300',
    badge: 'Level 6: Produce new or original work',
    description: 'Put elements together to form a novel, coherent whole.',
    verbs: 'design, assemble, construct, conjecture, develop, formulate, author, investigate',
  },
];

export const LearningOutcomesTab: React.FC<LearningOutcomesTabProps> = ({
  workshop,
  setWorkshop,
}) => {
  const outcomes = workshop.learningOutcomes || [];
  const maxOutcomes = 6;
  const isMaxReached = outcomes.length >= maxOutcomes;

  const handleAddOutcome = () => {
    if (isMaxReached) return;
    const nextIndex = outcomes.length + 1;
    const newOutcome: LearningOutcome = {
      id: `lo_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      code: `LO${nextIndex}`,
      text: '',
      bloomLevel: 'Understand',
    };
    setWorkshop((prev) => ({
      ...prev,
      learningOutcomes: [...(prev.learningOutcomes || []), newOutcome],
    }));
  };

  const handleUpdateOutcome = (index: number, updates: Partial<LearningOutcome>) => {
    const updated = [...outcomes];
    updated[index] = { ...updated[index], ...updates };
    setWorkshop((prev) => ({
      ...prev,
      learningOutcomes: updated,
    }));
  };

  const handleDeleteOutcome = (index: number) => {
    const filtered = outcomes.filter((_, i) => i !== index);
    // Renumber codes
    const renumbered = filtered.map((item, idx) => ({
      ...item,
      code: `LO${idx + 1}`,
    }));
    setWorkshop((prev) => ({
      ...prev,
      learningOutcomes: renumbered,
    }));
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= outcomes.length) return;
    const reordered = [...outcomes];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    // Renumber codes
    const renumbered = reordered.map((item, idx) => ({
      ...item,
      code: `LO${idx + 1}`,
    }));
    setWorkshop((prev) => ({
      ...prev,
      learningOutcomes: renumbered,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Limits */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-[#002B49]" />
              <h3 className="text-base font-bold text-slate-900">Learning Outcomes</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Define measurable student outcomes mapped to Bloom's Taxonomy. UCW guidelines enforce a
              maximum of <strong>6 learning outcomes</strong> per 2-hour workshop.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                isMaxReached
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-sky-50 text-sky-800 border-sky-200'
              }`}
            >
              {outcomes.length} / {maxOutcomes} Outcomes Defined
            </span>

            <button
              type="button"
              onClick={handleAddOutcome}
              disabled={isMaxReached}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#002B49] text-white text-xs font-bold hover:bg-[#003d66] shadow-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Add Outcome</span>
            </button>
          </div>
        </div>

        {isMaxReached && (
          <div className="mt-4 p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Maximum limit reached. 6 learning outcomes provide an optimal cognitive target for a
              2-hour workshop session.
            </span>
          </div>
        )}
      </div>

      {/* Outcome Cards List */}
      {outcomes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-800">No learning outcomes added yet</h4>
          <p className="text-xs text-slate-500 mt-1 mb-4 max-w-sm mx-auto">
            Click the button below to add your first outcome. Make sure to specify action verbs and
            Bloom's level.
          </p>
          <button
            type="button"
            onClick={handleAddOutcome}
            className="px-4 py-2 rounded-xl bg-[#002B49] text-white text-xs font-bold hover:bg-sky-900 shadow-xs cursor-pointer inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Add First Learning Outcome</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {outcomes.map((outcome, index) => {
            const bloomInfo =
              BLOOM_LEVELS.find((b) => b.level === outcome.bloomLevel) || BLOOM_LEVELS[1];

            return (
              <div
                key={outcome.id || index}
                className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 p-5 shadow-2xs transition-all space-y-4"
              >
                {/* Card Top Row */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg bg-[#002B49] text-white flex items-center justify-center font-extrabold text-xs shadow-2xs">
                      LO{index + 1}
                    </span>
                    <div>
                      <span className="text-xs font-bold text-slate-800">
                        Learning Outcome {index + 1}
                      </span>
                    </div>
                  </div>

                  {/* Actions: Reorder & Delete */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleMove(index, 'up')}
                      disabled={index === 0}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(index, 'down')}
                      disabled={index === outcomes.length - 1}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteOutcome(index)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer ml-1"
                      title="Delete Outcome"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Outcome Text Area */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Outcome Statement <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="e.g. Evaluate machine learning frameworks and commercial AI tooling for enterprise business process optimization."
                    value={outcome.text}
                    onChange={(e) => handleUpdateOutcome(index, { text: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#002B49]/20 focus:border-[#002B49] text-slate-900 leading-relaxed"
                  />
                </div>

                {/* Bloom's Taxonomy Selector */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Bloom's Taxonomy Level:
                    </label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {BLOOM_LEVELS.map((b) => {
                        const isSelected = outcome.bloomLevel === b.level;
                        return (
                          <button
                            key={b.level}
                            type="button"
                            onClick={() => handleUpdateOutcome(index, { bloomLevel: b.level })}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                              isSelected
                                ? `${b.color} shadow-xs ring-2 ring-offset-1 ring-slate-400`
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {b.level}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bloom Info Display */}
                  <div className="text-[11px] text-slate-600 flex items-start gap-2 pt-1">
                    <Info className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-800">{bloomInfo.badge}:</span>{' '}
                      <span>{bloomInfo.description}</span>
                      <span className="block text-slate-500 italic mt-0.5">
                        Key action verbs: {bloomInfo.verbs}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bloom's Taxonomy Reference Guide */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          Bloom's Taxonomy Pedagogical Reference
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center text-xs">
          {BLOOM_LEVELS.map((b, idx) => (
            <div key={b.level} className={`p-2.5 rounded-xl border ${b.color}`}>
              <span className="font-extrabold block text-xs">
                {idx + 1}. {b.level}
              </span>
              <span className="text-[10px] opacity-80 block mt-0.5 line-clamp-2">
                {b.description}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
