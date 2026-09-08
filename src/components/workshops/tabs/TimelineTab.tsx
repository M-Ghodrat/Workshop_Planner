import React, { useState } from 'react';
import {
  Clock,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  Sliders,
} from 'lucide-react';
import { Workshop, Topic, Subtopic } from '../../../types';

interface TimelineTabProps {
  workshop: Workshop;
  setWorkshop: React.Dispatch<React.SetStateAction<Workshop>>;
  focusedTopicId?: string | null;
}

export const TimelineTab: React.FC<TimelineTabProps> = ({
  workshop,
  setWorkshop,
  focusedTopicId,
}) => {
  const topics = workshop.topics || [];
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(
    focusedTopicId || topics[0]?.id || null
  );

  // Sync when focusedTopicId prop changes from left Table of Contents
  React.useEffect(() => {
    if (focusedTopicId) {
      setExpandedTopicId(focusedTopicId);
      setTimeout(() => {
        const el = document.getElementById(`topic-item-${focusedTopicId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [focusedTopicId]);

  // Compute total duration
  const totalMinutes = topics.reduce((acc, t) => acc + (Number(t.durationMinutes) || 0), 0);
  const targetMinutes = 120;
  const isExact120 = totalMinutes === targetMinutes;
  const isUnder120 = totalMinutes < targetMinutes;
  const isOver120 = totalMinutes > targetMinutes;

  const handleAddTopic = () => {
    const newTopicId = `top_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    // Estimate remaining minutes to reach 120 if possible, default to 30
    const remaining = Math.max(10, Math.min(60, targetMinutes - totalMinutes));
    const newTopic: Topic = {
      id: newTopicId,
      order: topics.length + 1,
      title: `Topic ${topics.length + 1}: `,
      description: '',
      durationMinutes: remaining > 0 ? remaining : 30,
      subtopics: [
        {
          id: `sub_${Date.now()}_1`,
          title: 'Subtopic overview & conceptual foundation',
          durationMinutes: Math.floor((remaining > 0 ? remaining : 30) / 2),
        },
      ],
    };

    const nextTopics = [...topics, newTopic];
    const newTotal = nextTopics.reduce((acc, t) => acc + (Number(t.durationMinutes) || 0), 0);

    setWorkshop((prev) => ({
      ...prev,
      topics: nextTopics,
      totalDurationMinutes: newTotal,
    }));
    setExpandedTopicId(newTopicId);
  };

  const handleUpdateTopic = (index: number, updates: Partial<Topic>) => {
    const updated = [...topics];
    updated[index] = { ...updated[index], ...updates };
    const newTotal = updated.reduce((acc, t) => acc + (Number(t.durationMinutes) || 0), 0);
    setWorkshop((prev) => ({
      ...prev,
      topics: updated,
      totalDurationMinutes: newTotal,
    }));
  };

  const handleDeleteTopic = (index: number) => {
    const filtered = topics.filter((_, i) => i !== index);
    const reordered = filtered.map((t, i) => ({ ...t, order: i + 1 }));
    const newTotal = reordered.reduce((acc, t) => acc + (Number(t.durationMinutes) || 0), 0);
    setWorkshop((prev) => ({
      ...prev,
      topics: reordered,
      totalDurationMinutes: newTotal,
    }));
  };

  const handleMoveTopic = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= topics.length) return;
    const reordered = [...topics];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    const updated = reordered.map((t, i) => ({ ...t, order: i + 1 }));
    setWorkshop((prev) => ({
      ...prev,
      topics: updated,
    }));
  };

  // Subtopic handlers
  const handleAddSubtopic = (topicIndex: number) => {
    const currentTopic = topics[topicIndex];
    const subtopics = currentTopic.subtopics || [];
    const newSubtopic: Subtopic = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      title: '',
      durationMinutes: 10,
    };
    handleUpdateTopic(topicIndex, {
      subtopics: [...subtopics, newSubtopic],
    });
  };

  const handleUpdateSubtopic = (
    topicIndex: number,
    subIndex: number,
    updates: Partial<Subtopic>
  ) => {
    const currentTopic = topics[topicIndex];
    const subtopics = [...(currentTopic.subtopics || [])];
    subtopics[subIndex] = { ...subtopics[subIndex], ...updates };
    handleUpdateTopic(topicIndex, { subtopics });
  };

  const handleDeleteSubtopic = (topicIndex: number, subIndex: number) => {
    const currentTopic = topics[topicIndex];
    const subtopics = (currentTopic.subtopics || []).filter((_, i) => i !== subIndex);
    handleUpdateTopic(topicIndex, { subtopics });
  };

  // Quick 120-minute balanced presets
  const applyBalancedPreset = () => {
    const presetTopics: Topic[] = [
      {
        id: `top_preset_1`,
        order: 1,
        title: 'Core Concepts & Theoretical Frameworks',
        description: 'Introduction to foundational models and industry standards.',
        durationMinutes: 25,
        subtopics: [
          { id: 'sub_1', title: 'Context & Key Terminology', durationMinutes: 10 },
          { id: 'sub_2', title: 'Framework Architecture & Case Context', durationMinutes: 15 },
        ],
      },
      {
        id: `top_preset_2`,
        order: 2,
        title: 'Strategic Analysis & Real-World Application',
        description: 'Analyzing case scenarios and identifying high-impact decision points.',
        durationMinutes: 35,
        subtopics: [
          { id: 'sub_3', title: 'Industry Use Cases & Benchmark Comparisons', durationMinutes: 20 },
          { id: 'sub_4', title: 'Quantitative / Qualitative Evaluation Matrix', durationMinutes: 15 },
        ],
      },
      {
        id: `top_preset_3`,
        order: 3,
        title: 'Interactive Hands-On Lab & Group Exercise',
        description: 'Collaborative cohort application and tool execution.',
        durationMinutes: 40,
        subtopics: [
          { id: 'sub_5', title: 'Tool Setup & Guided Workflow', durationMinutes: 20 },
          { id: 'sub_6', title: 'Group Synthesis & Deliverable Construction', durationMinutes: 20 },
        ],
      },
      {
        id: `top_preset_4`,
        order: 4,
        title: 'Synthesis, Review & Implementation Roadmap',
        description: 'Debriefing outcomes, Q&A, and establishing a 90-day action plan.',
        durationMinutes: 20,
        subtopics: [
          { id: 'sub_7', title: 'Peer Presentations & Instructor Feedback', durationMinutes: 10 },
          { id: 'sub_8', title: 'Key Takeaways & Action Plan', durationMinutes: 10 },
        ],
      },
    ];

    setWorkshop((prev) => ({
      ...prev,
      topics: presetTopics,
      totalDurationMinutes: 120,
    }));
  };

  return (
    <div className="space-y-6">
      {/* 2-Hour Timeline Header Bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-black uppercase italic tracking-tight text-slate-950">
              2-Hour Timeline Builder
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Structure the 120-minute university workshop into sequential pedagogical modules and exercises.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`px-4 py-2 rounded-lg text-white font-black text-xs uppercase tracking-wider shadow-sm flex items-center gap-2 ${
                isExact120
                  ? 'bg-emerald-600'
                  : isUnder120
                  ? 'bg-amber-500'
                  : 'bg-rose-600'
              }`}
            >
              {isExact120 ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <span>TOTAL: {totalMinutes} / 120 MINUTES</span>
            </div>

            <button
              type="button"
              onClick={handleAddTopic}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-950 text-white text-xs font-black uppercase tracking-wider hover:bg-slate-800 shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 text-blue-400" />
              <span>Add Topic</span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-5">
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex border border-slate-200">
            <div
              className={`h-full transition-all duration-300 ${
                isExact120 ? 'bg-emerald-500' : isUnder120 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(100, (totalMinutes / 120) * 100)}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-slate-400 mt-2">
            <span>0 MINS</span>
            <span className={isExact120 ? 'text-emerald-600' : isUnder120 ? 'text-amber-600' : 'text-rose-600'}>
              {isExact120 && '120-minute curriculum requirement fulfilled'}
              {isUnder120 && `${120 - totalMinutes} minutes remaining to reach target`}
              {isOver120 && `Exceeds 2-hour timeline limit by ${totalMinutes - 120} minutes`}
            </span>
            <span>120 MINS</span>
          </div>
        </div>

        {topics.length === 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Need a pre-built 120m structure?</span>
            <button
              type="button"
              onClick={applyBalancedPreset}
              className="px-3.5 py-1.5 rounded-lg bg-slate-950 text-white text-xs font-black uppercase tracking-wider hover:bg-slate-800 cursor-pointer shadow-xs"
            >
              Load Standard 120m Framework
            </button>
          </div>
        )}
      </div>

      {/* Topics List with Bold Theme border-l-8 Accent */}
      <div className="space-y-4">
        {topics.map((topic, index) => {
          const isExpanded = expandedTopicId === topic.id;
          const subtopics = topic.subtopics || [];
          const numStr = String(index + 1).padStart(2, '0');

          return (
            <div
              key={topic.id || index}
              id={`topic-item-${topic.id}`}
              className={`bg-white border-l-8 rounded-r-2xl border-y border-r shadow-sm overflow-hidden transition-all scroll-mt-24 ${
                expandedTopicId === topic.id
                  ? 'border-l-blue-600 border-slate-300 ring-2 ring-blue-500/20'
                  : 'border-l-slate-950 border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Topic Header Summary */}
              <div
                className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none hover:bg-slate-50/50"
                onClick={() => setExpandedTopicId(isExpanded ? null : topic.id)}
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black tracking-wider text-slate-400 uppercase">
                      {numStr} — TOPIC MODULE
                    </span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-900 rounded font-black text-xs uppercase tracking-wider">
                      {topic.durationMinutes || 0} MINS
                    </span>
                  </div>
                  <div className="text-lg font-black text-slate-950 tracking-tight">
                    {topic.title || `Untitled Topic ${index + 1}`}
                  </div>
                  {topic.description && (
                    <div className="text-xs text-slate-500 line-clamp-1">
                      {topic.description}
                    </div>
                  )}
                </div>

                {/* Quick actions */}
                <div
                  className="flex items-center gap-1.5 self-end sm:self-center shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => handleMoveTopic(index, 'up')}
                    disabled={index === 0}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                    title="Move Up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveTopic(index, 'down')}
                    disabled={index === topics.length - 1}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                    title="Move Down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTopic(index)}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                    title="Delete Topic"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpandedTopicId(isExpanded ? null : topic.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 cursor-pointer"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Expanded Topic Editor */}
              {isExpanded && (
                <div className="p-6 pt-0 border-t border-slate-100 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-4">
                    <div className="sm:col-span-3">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                        Topic Title <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. What is Generative AI for Business Leaders?"
                        value={topic.title}
                        onChange={(e) => handleUpdateTopic(index, { title: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm font-bold border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:border-slate-950 text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                        Duration (Minutes) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="5"
                          max="120"
                          step="5"
                          required
                          value={topic.durationMinutes}
                          onChange={(e) =>
                            handleUpdateTopic(index, {
                              durationMinutes: Number(e.target.value) || 0,
                            })
                          }
                          className="w-full pl-3.5 pr-12 py-2 text-sm font-black border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:border-slate-950 text-slate-900"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black uppercase tracking-wider text-slate-400 pointer-events-none">
                          MINS
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                      Pedagogical Description & Context
                    </label>
                    <textarea
                      rows={2}
                      placeholder="History of LLMs, transformational impacts, and foundational concepts..."
                      value={topic.description || ''}
                      onChange={(e) => handleUpdateTopic(index, { description: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs font-medium border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:border-slate-950 text-slate-800 leading-relaxed"
                    />
                  </div>

                  {/* Subtopics Section */}
                  <div className="pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-blue-600" />
                        Subtopic Breakdown
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAddSubtopic(index)}
                        className="text-xs text-blue-600 font-bold uppercase tracking-wider hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Subtopic</span>
                      </button>
                    </div>

                    {subtopics.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No subtopics added yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {subtopics.map((sub, sIdx) => (
                          <div
                            key={sub.id || sIdx}
                            className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200"
                          >
                            <span className="text-xs font-black text-slate-500 w-8 text-center">
                              {index + 1}.{sIdx + 1}
                            </span>
                            <input
                              type="text"
                              placeholder="Subtopic focus / activity..."
                              value={sub.title}
                              onChange={(e) =>
                                handleUpdateSubtopic(index, sIdx, { title: e.target.value })
                              }
                              className="flex-1 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 text-slate-900"
                            />
                            <div className="w-24 relative">
                              <input
                                type="number"
                                placeholder="mins"
                                value={sub.durationMinutes || ''}
                                onChange={(e) =>
                                  handleUpdateSubtopic(index, sIdx, {
                                    durationMinutes: Number(e.target.value) || 0,
                                  })
                                }
                                className="w-full pl-2.5 pr-8 py-1.5 text-xs font-bold border border-slate-200 rounded bg-white focus:outline-hidden text-slate-900"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase text-slate-400 pointer-events-none">
                                MIN
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteSubtopic(index, sIdx)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 cursor-pointer"
                              title="Remove Subtopic"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Add New Topic Dashed Trigger from Bold Design */}
        <button
          type="button"
          onClick={handleAddTopic}
          className="w-full p-6 bg-slate-100 hover:bg-slate-200/70 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 font-black uppercase tracking-[0.25em] text-xs py-8 transition-colors cursor-pointer"
        >
          + Add New Topic
        </button>
      </div>
    </div>
  );
};
