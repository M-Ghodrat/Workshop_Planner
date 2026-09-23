import React from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  BookOpen,
  GraduationCap,
  Lightbulb,
  Bookmark,
  Award,
  FileText,
  Users,
  X,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { Workshop, Material } from '../../types';
import { calculateWorkshopProgress, WorkshopDevelopmentStep } from '../../utils/workshopProgress';

interface WorkshopProgressModalProps {
  workshop: Workshop;
  materials?: Material[];
  onClose: () => void;
  onOpenWorkshop?: (workshop: Workshop, mode: 'edit' | 'preview') => void;
}

const STEP_ICONS: Record<string, React.FC<any>> = {
  overview: BookOpen,
  outcomes: GraduationCap,
  timeline: Clock,
  activities: Lightbulb,
  resources: Bookmark,
  dimensions: Award,
  materials: FileText,
  collaborators: Users,
};

export const WorkshopProgressModal: React.FC<WorkshopProgressModalProps> = ({
  workshop,
  materials = [],
  onClose,
  onOpenWorkshop,
}) => {
  const progress = calculateWorkshopProgress(workshop, materials);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-[#002B49] text-white p-5 sm:p-6 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-amber-400 text-slate-950 font-mono text-xs font-black">
                {workshop.prefix} {workshop.code}
              </span>
              <span className="text-xs text-sky-200 font-bold uppercase tracking-wider">
                Workshop Development Progress
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
              {workshop.title || 'Untitled Workshop'}
            </h3>
            <p className="text-xs text-sky-100/80 line-clamp-1">
              {workshop.seriesName || 'Stand-alone Series'} • Status: {workshop.status}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Score Banner */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center justify-between text-xs font-black">
              <span className="text-slate-700 uppercase tracking-wider">Overall Completion</span>
              <span className="text-[#002B49] text-sm">{progress.completedCount} / {progress.totalCount} Steps ({progress.percentage}%)</span>
            </div>
            {/* Progress bar */}
            <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  progress.percentage === 100
                    ? 'bg-emerald-500'
                    : progress.percentage >= 70
                    ? 'bg-blue-600'
                    : progress.percentage >= 40
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold uppercase tracking-wider border ${progress.readinessColor.bg} ${progress.readinessColor.text} ${progress.readinessColor.border}`}
            >
              {progress.readinessLabel}
            </span>
          </div>
        </div>

        {/* Development Steps Breakdown List */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-3 divide-y divide-slate-100 flex-1">
          <div className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
            8-Step Curriculum Development Checklist
          </div>

          {progress.steps.map((step, idx) => {
            const Icon = STEP_ICONS[step.id] || BookOpen;
            return (
              <div
                key={step.id}
                className={`pt-3 first:pt-0 p-3 rounded-xl transition-colors ${
                  step.isDone ? 'bg-emerald-50/40 border border-emerald-100/80' : 'bg-rose-50/40 border border-rose-100/80'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        step.isDone
                          ? 'bg-emerald-600 text-white'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {step.isDone ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <XCircle className="w-5 h-5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-black text-slate-400">
                          STEP {step.number}
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                          {step.label}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {step.description}
                      </p>
                      <div className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold">
                        <span className={step.isDone ? 'text-emerald-700' : 'text-rose-700'}>
                          • {step.detail}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shrink-0 ${
                      step.isDone
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                        : 'bg-rose-100 text-rose-900 border border-rose-200'
                    }`}
                  >
                    {step.statusText}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 sm:p-5 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {progress.completedCount === 8 ? (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" /> Ready for Academic Approval
              </span>
            ) : (
              <span>{8 - progress.completedCount} step(s) remaining for complete syllabus</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Close
            </button>
            {onOpenWorkshop && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenWorkshop(workshop, 'preview');
                }}
                className="px-4 py-2 rounded-xl bg-[#002B49] hover:bg-[#003d66] text-white text-xs font-bold shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>View Syllabus</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
