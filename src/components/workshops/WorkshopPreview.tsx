import React, { useState } from 'react';
import {
  ArrowLeft,
  Copy,
  Edit,
  GraduationCap,
  Clock,
  Lightbulb,
  Users,
  Award,
  CheckCircle2,
  XCircle,
  Bookmark,
  Check,
  ListChecks,
  FileText,
  BookOpen,
  ExternalLink,
  Printer,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Workshop, DimensionRating, Material } from '../../types';
import { calculateWorkshopProgress } from '../../utils/workshopProgress';

interface WorkshopPreviewProps {
  workshop: Workshop;
  materials?: Material[];
  onBack: () => void;
  onEdit: (workshop: Workshop) => void;
  onOpenMaterialPreview?: (material: Material) => void;
}

const DIMENSION_LABELS: Record<string, string> = {
  depthAndBreadth: '1. Depth and Breadth of Knowledge',
  methodologiesAndResearch: '2. Knowledge of Methodologies and Research',
  applicationOfKnowledge: '3. Application of Knowledge',
  communicationSkills: '4. Communication Skills',
  awarenessOfLimits: '5. Awareness of Limits of Knowledge',
  professionalCapacity: '6. Professional Capacity / Autonomy',
};

const RATING_EXPANDED: Record<string, { label: string; bg: string }> = {
  i: { label: 'Introduced', bg: 'bg-sky-100 text-sky-900 border-sky-300' },
  r: { label: 'Reinforced', bg: 'bg-indigo-100 text-indigo-900 border-indigo-300' },
  m: { label: 'Mastered', bg: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  'i**': {
    label: 'Introduced (Strong Emphasis)',
    bg: 'bg-sky-200 text-sky-950 border-sky-400 font-bold',
  },
  'r**': {
    label: 'Reinforced (Strong Emphasis)',
    bg: 'bg-indigo-200 text-indigo-950 border-indigo-400 font-bold',
  },
  'm**': {
    label: 'Mastered (Strong Emphasis)',
    bg: 'bg-emerald-200 text-emerald-950 border-emerald-400 font-bold',
  },
  NA: { label: 'Not Applicable', bg: 'bg-slate-100 text-slate-600 border-slate-200' },
  '': { label: 'Not Specified', bg: 'bg-slate-50 text-slate-400 border-slate-200 border-dashed' },
};

export const WorkshopPreview: React.FC<WorkshopPreviewProps> = ({
  workshop,
  materials = [],
  onBack,
  onEdit,
  onOpenMaterialPreview,
}) => {
  const { isAdmin } = useAuth();
  const { success } = useToast();
  const [copied, setCopied] = useState(false);
  const [showProgressDetails, setShowProgressDetails] = useState(true);

  const progress = calculateWorkshopProgress(workshop, materials);

  const attachedMaterials = materials.filter((m) => {
    if (m.activityId) return false;
    if (workshop.id && m.workshopId === workshop.id) return true;
    if (
      workshop.prefix?.trim() &&
      workshop.code?.trim() &&
      m.workshopTitle &&
      m.workshopTitle
        .toLowerCase()
        .includes(`${workshop.prefix.trim().toLowerCase()} ${workshop.code.trim().toLowerCase()}`)
    ) {
      return true;
    }
    return false;
  });

  const teachingNotesBoxes = React.useMemo(() => {
    if (Array.isArray(workshop.teachingNotes) && workshop.teachingNotes.length > 0) {
      const nonEmpty = workshop.teachingNotes.filter((tn) => tn.content?.trim());
      if (nonEmpty.length > 0) return nonEmpty;
    }
    if (workshop.contentNotes?.trim()) {
      const parts = workshop.contentNotes
        .split(/\n\s*---\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean);
      return parts.map((part, idx) => ({
        id: `tn_parsed_${idx}`,
        title:
          part.includes('## Workshop Teaching Plan')
            ? `Teaching Plan #${idx + 1}`
            : parts.length > 1
            ? `Lecture Teaching Note #${idx + 1}`
            : 'Teaching Note',
        templateType: part.includes('## Workshop Teaching Plan')
          ? ('teaching_plan' as const)
          : ('lecture_teaching_note' as const),
        content: part,
      }));
    }
    return [];
  }, [workshop.teachingNotes, workshop.contentNotes]);

  const cleanRequiredResources = (workshop.requiredResources || []).filter((r) => !r.materialId);
  const cleanOptionalResources = (workshop.optionalResources || []).filter((r) => !r.materialId);
  const totalMinutes = (workshop.topics || []).reduce(
    (acc, t) => acc + (Number(t.durationMinutes) || 0),
    0
  );

  const handleCopyText = () => {
    const text = `
UNIVERSITY CANADA WEST (UCW)
WORKSHOP OUTLINE & SPECIFICATION

Workshop: ${workshop.prefix} ${workshop.code} — ${workshop.title}
Series: ${workshop.seriesName || 'General Academic Series'}
Duration: ${workshop.totalDurationMinutes || 120} Minutes
Prerequisites: ${workshop.hasNoPrerequisites ? 'No prerequisite' : workshop.prerequisites || 'None'}
Status: ${workshop.status}

1. DESCRIPTION & PEDAGOGICAL INTENT:
${workshop.description || 'N/A'}

2. LEARNING OUTCOMES:
${(workshop.learningOutcomes || [])
  .map((lo, i) => `${lo.code || `LO${i + 1}`}: ${lo.text} [Bloom: ${lo.bloomLevel}]`)
  .join('\n')}

3. 2-HOUR TIMELINE BREAKDOWN:
${(workshop.topics || [])
  .map(
    (t, i) =>
      `Topic ${i + 1}: ${t.title} (${t.durationMinutes}m)\n` +
      (t.subtopics || []).map((s) => `   - ${s.title} (${s.durationMinutes || ''}m)`).join('\n')
  )
  .join('\n\n')}

4. ACTIVITIES & LABS:
${(workshop.activities || [])
  .map(
    (a, i) =>
      `Activity ${i + 1}: ${a.title} [${a.type}] (${a.estimatedMinutes || 20}m)\n${a.description || ''}`
  )
  .join('\n\n')}

5. RESOURCES:
Required: ${cleanRequiredResources.map((r) => r.title).join(', ') || 'None'}
Optional: ${cleanOptionalResources.map((r) => r.title).join(', ') || 'None'}

6. FACULTY DEVELOPERS:
${(workshop.assignedDevelopers || []).map((d) => `- ${d.name} (${d.role})`).join('\n')}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    success('Copied to Clipboard', 'Full workshop specification ready to paste.');
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar (hidden in print) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              Complete Workshop Outline Specification
            </h2>
            <p className="text-xs text-slate-500">
              Full compiled review document including timeline, activities, resources, teaching notes, and attached files
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleCopyText}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Copy className="w-4 h-4 text-slate-500" />
            )}
            <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                const dropdown = document.getElementById('preview-export-dropdown-menu');
                if (dropdown) dropdown.classList.toggle('hidden');
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#002B49] hover:bg-[#003d66] text-white text-xs font-black uppercase tracking-wider transition-colors cursor-pointer shadow-md"
            >
              <FileText className="w-4 h-4 text-amber-400" />
              <span>Download / Export ▼</span>
            </button>
            <div
              id="preview-export-dropdown-menu"
              className="hidden absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
            >
              <button
                type="button"
                onClick={() => {
                  const dropdown = document.getElementById('preview-export-dropdown-menu');
                  if (dropdown) dropdown.classList.add('hidden');
                  const text = `UNIVERSITY CANADA WEST (UCW)\nWORKSHOP SPECIFICATION: ${workshop.prefix} ${workshop.code} - ${workshop.title}\n\nDESCRIPTION:\n${workshop.description || ''}\n\nLEARNING OUTCOMES:\n${(workshop.learningOutcomes || []).map((lo) => `${lo.code}: ${lo.text} [Bloom: ${lo.bloomLevel}]`).join('\n')}\n\nTIMELINE:\n${(workshop.topics || []).map((t) => `${t.title} (${t.durationMinutes}m)\n${(t.subtopics || []).map((s) => `  - ${s.title} (${s.durationMinutes || 0}m)`).join('\n')}`).join('\n\n')}\n\nACTIVITIES:\n${(workshop.activities || []).map((a) => `${a.title} (${a.type}, ${a.estimatedMinutes || 20}m)\n${a.description || ''}`).join('\n\n')}\n\nTEACHING NOTES:\n${workshop.contentNotes || ''}`;
                  const blob = new Blob([text], { type: 'application/msword;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${workshop.prefix}_${workshop.code}_Specification.doc`.replace(/\s+/g, '_');
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  success('Doc Exported', 'Workshop specification downloaded as formatted document (.doc).');
                }}
                className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Save as Doc</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const dropdown = document.getElementById('preview-export-dropdown-menu');
                  if (dropdown) dropdown.classList.add('hidden');
                  const csvRows = [
                    ['Field', 'Detail'],
                    ['Workshop Code', `${workshop.prefix} ${workshop.code}`],
                    ['Title', `"${(workshop.title || '').replace(/"/g, '""')}"`],
                    ['Series', `"${(workshop.seriesName || '').replace(/"/g, '""')}"`],
                    ['Total Duration', `${workshop.totalDurationMinutes || 120} mins`],
                    ['Status', workshop.status],
                    ['Description', `"${(workshop.description || '').replace(/"/g, '""')}"`],
                    ['Learning Outcomes', `"${(workshop.learningOutcomes || []).map((lo) => `${lo.code}: ${lo.text} [${lo.bloomLevel}]`).join('; ').replace(/"/g, '""')}"`],
                    ['Timeline Topics', `"${(workshop.topics || []).map((t) => `${t.title} (${t.durationMinutes}m)`).join('; ').replace(/"/g, '""')}"`],
                    ['Activities', `"${(workshop.activities || []).map((a) => `${a.title} [${a.type}]`).join('; ').replace(/"/g, '""')}"`],
                    ['Teaching Notes', `"${(workshop.contentNotes || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`],
                  ];
                  const csvContent = csvRows.map((e) => e.join(',')).join('\n');
                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${workshop.prefix}_${workshop.code}_Spreadsheet.csv`.replace(/\s+/g, '_');
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  success('Excel Exported', 'Workshop outline downloaded as Excel CSV spreadsheet.');
                }}
                className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-100 flex items-center gap-2 cursor-pointer border-t border-slate-100"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                <span>Save as Excel</span>
              </button>
            </div>
          </div>

          <button
            onClick={() => onEdit(workshop)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#002B49] hover:bg-[#003d66] text-white text-xs font-bold shadow-md transition-colors cursor-pointer"
          >
            <Edit className="w-4 h-4 text-amber-400" />
            <span>Open Workspace</span>
          </button>
        </div>
      </div>

      {/* Admin Development Progress Summary (print:hidden) */}
      {isAdmin && (
        <div className="print:hidden bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#002B49] text-white flex items-center justify-center font-bold">
                <ListChecks className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Administrator Review Checklist
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${progress.readinessColor.bg} ${progress.readinessColor.text} ${progress.readinessColor.border}`}
                  >
                    {progress.readinessLabel}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  {progress.completedCount} of {progress.totalCount} curriculum development steps complete ({progress.percentage}%)
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowProgressDetails(!showProgressDetails)}
              className="text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline self-start sm:self-auto cursor-pointer"
            >
              {showProgressDetails ? 'Hide Step Details' : 'Show Step Details'}
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
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

          {/* 8-Step Breakdown Grid */}
          {showProgressDetails && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2">
              {progress.steps.map((st) => (
                <div
                  key={st.id}
                  className={`p-2.5 rounded-xl border transition-all ${
                    st.isDone
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : 'bg-rose-50/50 border-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-slate-400">
                      STEP {st.number}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase ${
                        st.isDone ? 'text-emerald-800' : 'text-rose-700'
                      }`}
                    >
                      {st.isDone ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Done</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 text-rose-600" />
                          <span>Not Done</span>
                        </>
                      )}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mt-1 truncate">
                    {st.label}
                  </h4>
                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                    {st.detail}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Aggregated Document Container (Matches Complete Workshop Overview) */}
      <div
        id="workshop-specification-document"
        className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10 space-y-10"
      >
        {/* Document Institutional Header */}
        <div className="border-b-2 border-[#002B49] pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-[#002B49] text-white flex items-center justify-center font-extrabold text-xl shrink-0 shadow-md">
              <GraduationCap className="w-8 h-8 text-amber-400" />
            </div>
            <div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-slate-500 block">
                University Canada West (UCW)
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#002B49] tracking-tight">
                Workshop Curriculum Specification
              </h1>
              <span className="text-xs font-semibold text-slate-600 block mt-0.5">
                Academic Affairs • Collaborative Workshop Development Platform
              </span>
            </div>
          </div>

          <div className="text-right self-end sm:self-auto">
            <div className="inline-block px-3 py-1 rounded-lg bg-[#002B49] text-white font-extrabold text-sm tracking-wider shadow-2xs">
              {workshop.prefix} {workshop.code}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">
              Status: <strong>{workshop.status}</strong>
            </div>
          </div>
        </div>

        {/* Section 01: Core Information & Overview */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-[#002B49] text-white flex items-center justify-center text-xs font-bold">
                01
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-950 uppercase tracking-tight flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>General Overview & Classification</span>
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3.5 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                Workshop Identifier
              </span>
              <span className="font-black text-slate-900 text-sm">
                {workshop.prefix} {workshop.code || '###'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                Workshop Level
              </span>
              <span className="font-black text-blue-700 text-xs">
                {workshop.level || 'Foundation'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                Workshop Series
              </span>
              <span className="font-bold text-slate-900">
                {workshop.seriesName || 'General Academic Series'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                Date Schedule
              </span>
              <span className="font-bold text-slate-900">
                {workshop.startDate
                  ? `${workshop.startDate}${workshop.endDate ? ` to ${workshop.endDate}` : ''}`
                  : 'Not Scheduled'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                Prerequisites
              </span>
              <span className="font-bold text-slate-900">
                {workshop.hasNoPrerequisites ? 'No prerequisite' : workshop.prerequisites || 'None'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                Last Revised
              </span>
              <span className="font-bold text-slate-900">
                {new Date(workshop.updatedAt || Date.now()).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Workshop Title
            </h4>
            <div className="text-lg font-black text-slate-950">
              {workshop.title || 'Untitled Workshop Specification'}
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Workshop Description
            </h4>
            <div className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50/70 p-4 rounded-xl border border-slate-200 whitespace-pre-line">
              {workshop.description || (
                <span className="italic text-slate-400">No workshop description entered yet.</span>
              )}
            </div>
          </div>
        </section>

        {/* Section 02: Learning Outcomes */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-[#002B49] text-white flex items-center justify-center text-xs font-bold">
                02
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-950 uppercase tracking-tight flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-emerald-600" />
                <span>Learning Outcomes ({workshop.learningOutcomes?.length || 0})</span>
              </h2>
            </div>
          </div>

          {!workshop.learningOutcomes || workshop.learningOutcomes.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
              No learning outcomes recorded yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {workshop.learningOutcomes.map((lo, idx) => (
                <div
                  key={lo.id || idx}
                  className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs"
                >
                  <span className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black shrink-0 text-xs">
                    {lo.code || `LO${idx + 1}`}
                  </span>
                  <div className="flex-1 space-y-1">
                    <p className="text-slate-900 font-semibold leading-relaxed">{lo.text}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-800 text-[10px] font-black uppercase tracking-wider shrink-0">
                    Bloom: {lo.bloomLevel}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section 03: 2-Hour Timeline Breakdown */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-[#002B49] text-white flex items-center justify-center text-xs font-bold">
                03
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-950 uppercase tracking-tight flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>2-Hour Workshop Delivery Timeline ({totalMinutes}/120 Mins)</span>
              </h2>
            </div>
          </div>

          {!workshop.topics || workshop.topics.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
              No timeline topics added yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-100 text-slate-700 font-black uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 w-16">Item</th>
                    <th className="py-2.5 px-3">Topic Title & Subtopics</th>
                    <th className="py-2.5 px-3 w-28 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {workshop.topics.map((t, idx) => (
                    <React.Fragment key={t.id || idx}>
                      <tr className="bg-slate-50 font-black text-slate-950">
                        <td className="py-2.5 px-3">T{idx + 1}</td>
                        <td className="py-2.5 px-3">{t.title}</td>
                        <td className="py-2.5 px-3 text-right text-slate-900 font-mono">
                          {t.durationMinutes} mins
                        </td>
                      </tr>
                      {t.description && (
                        <tr className="bg-white">
                          <td />
                          <td colSpan={2} className="py-1.5 px-3 text-slate-600 text-[11px] italic">
                            {t.description}
                          </td>
                        </tr>
                      )}
                      {(t.subtopics || []).map((sub, sIdx) => (
                        <tr key={sub.id || sIdx} className="bg-white text-slate-700">
                          <td className="py-1.5 px-3 text-slate-400 text-[11px] text-right font-mono">
                            {idx + 1}.{sIdx + 1}
                          </td>
                          <td className="py-1.5 px-3 pl-6 text-slate-800">• {sub.title}</td>
                          <td className="py-1.5 px-3 text-right text-slate-500 font-mono text-[11px]">
                            {sub.durationMinutes ? `${sub.durationMinutes}m` : '—'}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Section 04: Activities & Labs */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-[#002B49] text-white flex items-center justify-center text-xs font-bold">
                04
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-950 uppercase tracking-tight flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-purple-600" />
                <span>Experiential Activities & Labs ({workshop.activities?.length || 0})</span>
              </h2>
            </div>
          </div>

          {!workshop.activities || workshop.activities.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
              No hands-on activities specified yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {workshop.activities.map((act, idx) => {
                const actFiles = [
                  ...(act.attachments || []),
                  ...materials.filter((m) => m.activityId === act.id),
                ].filter((m, i, arr) => m?.id && arr.findIndex((x) => x.id === m.id) === i);

                return (
                  <div
                    key={act.id || idx}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-950 text-sm">
                        Activity {idx + 1}: {act.title}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[10px] font-bold">
                          {act.type}
                        </span>
                        <span className="text-slate-600 font-mono text-[11px] font-bold">
                          {act.estimatedMinutes || 20} mins
                        </span>
                      </div>
                    </div>
                    {act.description && (
                      <p className="text-slate-700 leading-relaxed">{act.description}</p>
                    )}
                    {act.instructions && (
                      <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-700">
                        <strong className="text-slate-900 font-bold">Facilitator Instructions:</strong>{' '}
                        {act.instructions}
                      </div>
                    )}
                    {actFiles.length > 0 && (
                      <div className="pt-1 space-y-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                          Activity Files ({actFiles.length})
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {actFiles.map((file) => (
                            <button
                              key={file.id}
                              type="button"
                              onClick={() => onOpenMaterialPreview?.(file)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-blue-400 text-xs font-bold text-slate-800 cursor-pointer shadow-2xs"
                            >
                              <FileText className="w-3.5 h-3.5 text-blue-600" />
                              <span>{file.title}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                ({file.fileName})
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Section 05: Resources */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-[#002B49] text-white flex items-center justify-center text-xs font-bold">
                05
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-950 uppercase tracking-tight flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-sky-600" />
                <span>Required & Optional Resources</span>
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Required Resources ({cleanRequiredResources.length})
              </h4>
              {cleanRequiredResources.length > 0 ? (
                <div className="space-y-2">
                  {cleanRequiredResources.map((res, i) => (
                    <div key={i} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                      <div className="font-bold text-slate-900">{res.title}</div>
                      {res.description && (
                        <div className="text-slate-600 text-[11px] mt-0.5">{res.description}</div>
                      )}
                      {res.url && (
                        <a
                          href={res.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline text-[11px] flex items-center gap-1 mt-1 truncate"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span className="truncate">{res.url}</span>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">None specified</p>
              )}
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Optional Resources ({cleanOptionalResources.length})
              </h4>
              {cleanOptionalResources.length > 0 ? (
                <div className="space-y-2">
                  {cleanOptionalResources.map((res, i) => (
                    <div key={i} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                      <div className="font-bold text-slate-900">{res.title}</div>
                      {res.description && (
                        <div className="text-slate-600 text-[11px] mt-0.5">{res.description}</div>
                      )}
                      {res.url && (
                        <a
                          href={res.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline text-[11px] flex items-center gap-1 mt-1 truncate"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span className="truncate">{res.url}</span>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">None specified</p>
              )}
            </div>
          </div>
        </section>

        {/* Section 06: UCW Dimensions Matrix */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-[#002B49] text-white flex items-center justify-center text-xs font-bold">
                06
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-950 uppercase tracking-tight flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <span>UCW Dimensions of Knowledge Matrix</span>
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            {Object.entries(DIMENSION_LABELS).map(([key, label]) => {
              const rating =
                (workshop.dimensionsOfKnowledge?.[
                  key as keyof typeof workshop.dimensionsOfKnowledge
                ] as DimensionRating) || 'r';
              const ratingInfo = RATING_EXPANDED[rating] || RATING_EXPANDED['r'];

              return (
                <div
                  key={key}
                  className="p-3.5 rounded-xl border border-slate-200 bg-white flex flex-col justify-between gap-2 shadow-2xs"
                >
                  <span className="font-bold text-slate-900 text-xs">{label}</span>
                  <span
                    className={`px-2.5 py-1 rounded-md text-[11px] border self-start ${ratingInfo.bg}`}
                  >
                    {rating.toUpperCase()} — {ratingInfo.label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 07: Materials & Pedagogical Content */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-[#002B49] text-white flex items-center justify-center text-xs font-bold">
                07
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-950 uppercase tracking-tight flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Materials & Pedagogical Content ({attachedMaterials.length} files)</span>
              </h2>
            </div>
          </div>

          {/* Teaching Notes (Rendered in Separate Boxes) */}
          {teachingNotesBoxes.length > 0 && (
            <div className="space-y-3">
              {teachingNotesBoxes.map((note, idx) => (
                <div
                  key={note.id || idx}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <div className="font-black text-slate-950 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{note.title || `Teaching Note #${idx + 1}`}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                      {note.templateType === 'teaching_plan'
                        ? 'Teaching Plan'
                        : 'Lecture Teaching Note'}
                    </span>
                  </div>
                  <pre className="text-slate-800 font-sans text-xs whitespace-pre-wrap leading-relaxed">
                    {note.content}
                  </pre>
                </div>
              ))}
            </div>
          )}

          {/* Facilitator Notes */}
          {workshop.instructorNotes && (
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 text-xs space-y-1.5">
              <div className="font-black text-amber-900 uppercase tracking-wider text-[11px]">
                Instructor Delivery & Cohort Management Guide
              </div>
              <p className="text-amber-950 text-xs whitespace-pre-wrap leading-relaxed">
                {workshop.instructorNotes}
              </p>
            </div>
          )}

          {/* Technical Equipment / Tools */}
          {workshop.equipmentRequirements && (
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white text-xs space-y-1">
              <span className="font-bold text-slate-900 text-[11px] uppercase tracking-wider">
                Required Software & Classroom Equipment:
              </span>
              <p className="text-slate-700 whitespace-pre-wrap">{workshop.equipmentRequirements}</p>
            </div>
          )}

          {/* Attached Files Grid */}
          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
              Attached Digital Assets & Workshop Files ({attachedMaterials.length})
            </h4>
            {attachedMaterials.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
                No files currently attached to this workshop.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {attachedMaterials.map((mat) => (
                  <div
                    key={mat.id}
                    onClick={() => onOpenMaterialPreview?.(mat)}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-all cursor-pointer text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 truncate">{mat.title}</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-bold uppercase">
                        {mat.category}
                      </span>
                    </div>
                    {mat.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-2">{mat.description}</p>
                    )}
                    <div className="text-[10px] text-slate-400 pt-1">
                      Added by {mat.uploadedByName || 'Faculty'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Section 08: Faculty Collaborators */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-[#002B49] text-white flex items-center justify-center text-xs font-bold">
                08
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-950 uppercase tracking-tight flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-600" />
                <span>
                  Faculty Developers & Contributors ({workshop.assignedDevelopers?.length || 0})
                </span>
              </h2>
            </div>
          </div>

          {!workshop.assignedDevelopers || workshop.assignedDevelopers.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
              No faculty developers assigned yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {workshop.assignedDevelopers.map((dev) => (
                <div
                  key={dev.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-0.5"
                >
                  <div className="font-bold text-slate-900">{dev.name}</div>
                  <div className="text-[11px] font-semibold text-blue-700">{dev.role}</div>
                  <div className="text-[11px] text-slate-500 truncate">{dev.email}</div>
                  {dev.department && (
                    <div className="text-[10px] text-slate-400">{dev.department}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Institutional Sign-off Footer */}
        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center text-[11px] text-slate-400 gap-2">
          <span>University Canada West • Curriculum & Workshop Quality Assurance</span>
          <span>Verified Document • UCW Workshop Planner</span>
        </div>
      </div>
    </div>
  );
};
