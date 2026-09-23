import React, { useEffect } from 'react';
import {
  X,
  BookOpen,
  Clock,
  Users,
  Shield,
  Layers,
  Lock,
  Calendar,
  Building,
  CheckCircle2,
  Tag,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { Workshop, WorkshopSeries } from '../../types';

interface WorkshopQuickOverviewModalProps {
  workshop: Workshop | null;
  seriesList?: WorkshopSeries[];
  onClose: () => void;
}

export const WorkshopQuickOverviewModal: React.FC<WorkshopQuickOverviewModalProps> = ({
  workshop,
  seriesList = [],
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!workshop) return null;

  const parentSeries = seriesList.find(
    (s) => s.id === workshop.seriesId || s.name === workshop.seriesName
  );

  const seriesName = workshop.seriesName || parentSeries?.name || 'Curriculum Track';
  const prefix = workshop.prefix || parentSeries?.prefix || 'UCW';
  const code = workshop.code || '101';

  const assignedDevs =
    workshop.assignedDevelopers && workshop.assignedDevelopers.length > 0
      ? workshop.assignedDevelopers
      : workshop.createdByName
      ? [{ id: workshop.createdBy || 'author', name: workshop.createdByName, email: '' }]
      : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#002B49] via-[#003860] to-[#002B49] text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
            title="Close summary"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-md bg-amber-400 text-[#002B49] text-xs font-black uppercase tracking-wider">
              {prefix} {code}
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-white/15 text-white/90 text-xs font-semibold backdrop-blur-xs">
              {workshop.status || 'In Development'}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-sky-200 font-medium ml-auto pr-8">
              <Lock className="w-3 h-3 text-amber-300" />
              <span>Overview Only</span>
            </span>
          </div>

          <h3 className="text-xl font-extrabold text-white leading-tight">
            {workshop.title}
          </h3>

          <div className="flex items-center gap-2 text-xs text-sky-200/90 mt-2 font-medium">
            <Layers className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>Series: {seriesName}</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Restricted Notice Banner */}
          <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-950 flex items-start gap-3">
            <Shield className="w-4 h-4 text-[#002B49] shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <span className="font-bold text-[#002B49]">Restricted Outline Access:</span>{' '}
              Detailed module breakdowns, lesson timelines, and curriculum materials for this workshop are restricted to the assigned series lead and developers. You are viewing the institutional workshop summary.
            </div>
          </div>

          {/* Key Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" /> Duration
              </span>
              <span className="text-xs font-bold text-slate-900">
                {workshop.totalDurationMinutes || 120} minutes
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1 flex items-center gap-1">
                <Building className="w-3 h-3 text-slate-400" /> Department
              </span>
              <span className="text-xs font-bold text-slate-900 truncate block">
                {parentSeries?.coreFocus || 'Curriculum Track'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1 flex items-center gap-1">
                <FileText className="w-3 h-3 text-slate-400" /> Delivery Format
              </span>
              <span className="text-xs font-bold text-slate-900">
                {workshop.deliveryFormat || 'Interactive Lab & Workshop'}
              </span>
            </div>
          </div>

          {/* Workshop Description */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-slate-400" />
              <span>Workshop Description & Scope</span>
            </h4>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs sm:text-sm leading-relaxed">
              {workshop.description || (
                <span className="italic text-slate-400">No description provided yet for this workshop outline.</span>
              )}
            </div>
          </div>

          {/* Assigned Faculty & Developers */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>Assigned Developers</span>
            </h4>
            {assignedDevs.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {assignedDevs.map((dev) => (
                  <div
                    key={dev.id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs text-xs font-semibold text-slate-800"
                  >
                    <span className="w-5 h-5 rounded-full bg-[#002B49] text-white flex items-center justify-center text-[10px] font-bold">
                      {dev.name?.charAt(0).toUpperCase() || 'D'}
                    </span>
                    <span>{dev.name}</span>
                    {dev.email && (
                      <span className="text-[10px] text-slate-400 font-normal">
                        ({dev.email})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs italic text-slate-400">
                No developer assigned yet to this workshop.
              </p>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">
            University Canada West (UCW) Academic Affairs
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#002B49] text-white text-xs font-bold hover:bg-[#003d66] transition-colors cursor-pointer"
          >
            Close Overview
          </button>
        </div>
      </div>
    </div>
  );
};
