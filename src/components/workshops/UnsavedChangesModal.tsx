import React from 'react';
import { AlertTriangle, Trash2, ArrowLeft, Save, LogOut, X } from 'lucide-react';

interface UnsavedChangesModalProps {
  isOpen: boolean;
  workshopTitle?: string;
  workshopCode?: string;
  isNewWorkshop?: boolean;
  targetActionType?: 'view' | 'logout' | 'create-fresh' | 'unknown';
  targetViewName?: string;
  onDiscardAndLeave: () => void;
  onStayAndEdit: () => void;
  onSaveAndContinue?: () => void;
  isSaving?: boolean;
}

export const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
  isOpen,
  workshopTitle,
  workshopCode,
  isNewWorkshop = false,
  targetActionType = 'view',
  targetViewName = 'another page',
  onDiscardAndLeave,
  onStayAndEdit,
  onSaveAndContinue,
  isSaving = false,
}) => {
  if (!isOpen) return null;

  const isLogout = targetActionType === 'logout';

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header with High-Contrast Alert Styling */}
        <div className="p-5 sm:p-6 bg-amber-500/10 border-b border-amber-200/80 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
              <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded border border-amber-300">
                Unsaved Workshop Warning
              </span>
              <h3 className="text-base sm:text-lg font-black text-slate-950 mt-1">
                {isLogout ? 'Sign Out With Unsaved Changes?' : 'Leave Without Saving?'}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onStayAndEdit}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/60 transition-colors cursor-pointer"
            title="Close warning"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 space-y-4">
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            You are currently {isNewWorkshop ? 'creating a new' : 'editing a'} workshop with{' '}
            <strong className="text-slate-900 font-bold">non-saved modifications</strong>. If you{' '}
            {isLogout ? 'sign out' : `leave to ${targetViewName}`} now, all unsaved progress and
            draft inputs will be <strong className="text-rose-600 font-bold">permanently lost and cleared</strong>.
          </p>

          {/* Workshop Draft Card */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                {isNewWorkshop ? 'New Workshop Draft' : 'Unsaved Workshop Draft'}
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                {workshopCode ? `${workshopCode}: ` : ''}
                {workshopTitle || 'Untitled Workshop Outline'}
              </div>
            </div>
            <span className="px-2 py-1 rounded bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-wider shrink-0">
              Unsaved
            </span>
          </div>

          <div className="text-[11px] text-slate-500 bg-rose-50 border border-rose-100 p-2.5 rounded-lg text-rose-800">
            ⚠️ <strong>Action notice:</strong> Choosing <em>&quot;Discard & Leave&quot;</em> will completely clear any unsaved inputs so no broken drafts remain.
          </div>
        </div>

        {/* Modal Footer / Action Buttons */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
          {/* Stay / Cancel Button */}
          <button
            type="button"
            onClick={onStayAndEdit}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer shadow-2xs text-center"
          >
            Stay & Keep Editing
          </button>

          {/* Discard & Leave Button */}
          <button
            type="button"
            onClick={onDiscardAndLeave}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
          >
            {isLogout ? (
              <>
                <LogOut className="w-3.5 h-3.5" />
                <span>Discard & Sign Out</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Discard & Leave</span>
              </>
            )}
          </button>

          {/* Save & Continue Button */}
          {onSaveAndContinue && (
            <button
              type="button"
              onClick={onSaveAndContinue}
              disabled={isSaving}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#002B49] hover:bg-[#003d66] text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5 text-amber-300" />
              <span>{isSaving ? 'Saving...' : 'Save & Continue'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
