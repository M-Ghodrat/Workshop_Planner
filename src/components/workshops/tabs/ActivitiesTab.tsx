import React from 'react';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Users,
  Clock,
  FileText,
  Lightbulb,
} from 'lucide-react';
import { Workshop, WorkshopActivity, ActivityType } from '../../../types';

interface ActivitiesTabProps {
  workshop: Workshop;
  setWorkshop: React.Dispatch<React.SetStateAction<Workshop>>;
}

const ACTIVITY_TYPES: { type: ActivityType; badge: string; color: string }[] = [
  { type: 'Individual Exercise', badge: 'Solo', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { type: 'Group Exercise', badge: 'Cohort', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { type: 'Case Study', badge: 'Analysis', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { type: 'Discussion', badge: 'Dialogue', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { type: 'Demonstration', badge: 'Demo', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  { type: 'Hands-on Lab', badge: 'Lab', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { type: 'Simulation', badge: 'Scenario', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { type: 'Reflection', badge: 'Synthesis', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { type: 'Quiz', badge: 'Assessment', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { type: 'Presentation', badge: 'Deliverable', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  { type: 'Other', badge: 'General', color: 'bg-slate-100 text-slate-700 border-slate-200' },
];

export const ActivitiesTab: React.FC<ActivitiesTabProps> = ({ workshop, setWorkshop }) => {
  const activities = workshop.activities || [];

  const handleAddActivity = () => {
    const newAct: WorkshopActivity = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      order: activities.length + 1,
      title: '',
      type: 'Group Exercise',
      description: '',
      instructions: '',
      estimatedMinutes: 20,
    };
    setWorkshop((prev) => ({
      ...prev,
      activities: [...(prev.activities || []), newAct],
    }));
  };

  const handleUpdateActivity = (index: number, updates: Partial<WorkshopActivity>) => {
    const updated = [...activities];
    updated[index] = { ...updated[index], ...updates };
    setWorkshop((prev) => ({
      ...prev,
      activities: updated,
    }));
  };

  const handleDeleteActivity = (index: number) => {
    const filtered = activities.filter((_, i) => i !== index);
    const reordered = filtered.map((act, i) => ({ ...act, order: i + 1 }));
    setWorkshop((prev) => ({
      ...prev,
      activities: reordered,
    }));
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= activities.length) return;
    const reordered = [...activities];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    const updated = reordered.map((act, i) => ({ ...act, order: i + 1 }));
    setWorkshop((prev) => ({
      ...prev,
      activities: updated,
    }));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <h3 className="text-base font-bold text-slate-900">Hands-On Activities & Labs</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Design engaging interactive activities, case studies, breakout debates, or hands-on
              exercises to reinforce workshop learning outcomes.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddActivity}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#002B49] text-white text-xs font-bold hover:bg-[#003d66] shadow-xs transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Add Activity</span>
          </button>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-800">No hands-on activities configured</h4>
          <p className="text-xs text-slate-500 mt-1 mb-4 max-w-sm mx-auto">
            Add experiential exercises, case study evaluations, or practical software demos for your
            students.
          </p>
          <button
            type="button"
            onClick={handleAddActivity}
            className="px-4 py-2 rounded-xl bg-[#002B49] text-white text-xs font-bold hover:bg-sky-900 shadow-xs cursor-pointer inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Create First Activity</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity, index) => {
            const currentType =
              ACTIVITY_TYPES.find((t) => t.type === activity.type) || ACTIVITY_TYPES[0];

            return (
              <div
                key={activity.id || index}
                className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 p-5 shadow-2xs transition-all space-y-4"
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg bg-[#002B49] text-white flex items-center justify-center font-extrabold text-xs shadow-2xs">
                      A{index + 1}
                    </span>
                    <div>
                      <span className="text-xs font-bold text-slate-800">
                        Activity {index + 1}: {activity.title || 'Untitled Activity'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleMove(index, 'up')}
                      disabled={index === 0}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(index, 'down')}
                      disabled={index === activities.length - 1}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteActivity(index)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer ml-1"
                      title="Delete Activity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Activity Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Enterprise AI Disruption Case Analysis"
                      value={activity.title}
                      onChange={(e) => handleUpdateActivity(index, { title: e.target.value })}
                      className="w-full px-3 py-2 text-xs sm:text-sm font-semibold border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#002B49]/20 focus:border-[#002B49] text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Activity Format
                    </label>
                    <select
                      value={activity.type}
                      onChange={(e) =>
                        handleUpdateActivity(index, { type: e.target.value as ActivityType })
                      }
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-[#002B49]/20 focus:border-[#002B49] text-slate-800"
                    >
                      {ACTIVITY_TYPES.map((t) => (
                        <option key={t.type} value={t.type}>
                          {t.type}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Activity Overview / Scenario Brief
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Explain the background scenario, problem statement, or target goal..."
                      value={activity.description}
                      onChange={(e) => handleUpdateActivity(index, { description: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#002B49]/20 focus:border-[#002B49] text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Duration (Mins)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="5"
                        max="120"
                        step="5"
                        value={activity.estimatedMinutes || ''}
                        onChange={(e) =>
                          handleUpdateActivity(index, {
                            estimatedMinutes: Number(e.target.value) || 0,
                          })
                        }
                        className="w-full pl-3 pr-10 py-2 text-xs sm:text-sm font-semibold border border-slate-300 rounded-xl focus:outline-hidden text-slate-900"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                        mins
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Student Instructions & Facilitator Prompts
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Step 1: Form teams of 3... Step 2: Open Worksheet B... Step 3: Present key findings..."
                    value={activity.instructions || ''}
                    onChange={(e) => handleUpdateActivity(index, { instructions: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#002B49]/20 focus:border-[#002B49] text-slate-800 font-mono text-[11px]"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
