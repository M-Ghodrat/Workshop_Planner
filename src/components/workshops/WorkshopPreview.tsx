import React, { useState } from 'react';
import {
  ArrowLeft,
  Copy,
  Edit,
  GraduationCap,
  Clock,
  Layers,
  Users,
  Award,
  CheckCircle2,
  Bookmark,
  Building,
  Check,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { Workshop, DimensionRating } from '../../types';

interface WorkshopPreviewProps {
  workshop: Workshop;
  onBack: () => void;
  onEdit: (workshop: Workshop) => void;
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

export const WorkshopPreview: React.FC<WorkshopPreviewProps> = ({ workshop, onBack, onEdit }) => {
  const { success } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopyText = () => {
    const text = `
UNIVERSITY CANADA WEST (UCW)
WORKSHOP SPECIFICATION DOCUMENT

Workshop: ${workshop.prefix} ${workshop.code} — ${workshop.title}
Series: ${workshop.seriesName || 'Standalone Workshop'}
Duration: ${workshop.totalDurationMinutes || 120} Minutes
Prerequisites: ${workshop.prerequisites || 'No prerequisite'}
Status: ${workshop.status}

DESCRIPTION:
${workshop.description || 'N/A'}

LEARNING OUTCOMES:
${(workshop.learningOutcomes || [])
  .map((lo, i) => `${lo.code || `LO${i + 1}`}: ${lo.text} [Bloom Level: ${lo.bloomLevel}]`)
  .join('\n')}

TIMELINE (120 MINUTES):
${(workshop.topics || [])
  .map(
    (t, i) =>
      `Topic ${i + 1}: ${t.title} (${t.durationMinutes}m)\n` +
      (t.subtopics || []).map((s) => `   - ${s.title} (${s.durationMinutes || ''}m)`).join('\n')
  )
  .join('\n\n')}

ACTIVITIES:
${(workshop.activities || [])
  .map((a, i) => `Activity ${i + 1}: ${a.title} [${a.type}] (${a.estimatedMinutes || 20}m)\n${a.description || ''}`)
  .join('\n\n')}

FACULTY DEVELOPERS:
${(workshop.assignedDevelopers || []).map((d) => `- ${d.name} (${d.role}) - ${d.email}`).join('\n')}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    success('Copied to Clipboard', 'Workshop outline summary ready to paste.');
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
            title="Back to editor"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              Official Workshop Specification Preview
            </h2>
            <p className="text-xs text-slate-500">
              Ready for academic curriculum review and faculty delivery
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

          <button
            onClick={() => onEdit(workshop)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#002B49] hover:bg-[#003d66] text-white text-xs font-bold shadow-md transition-colors cursor-pointer"
          >
            <Edit className="w-4 h-4 text-amber-400" />
            <span>Edit Workspace</span>
          </button>
        </div>
      </div>

      {/* Institutional Document Canvas */}
      <div
        id="workshop-specification-document"
        className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 sm:p-10 max-w-4xl mx-auto space-y-8"
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

        {/* Course Title & Core Metadata Grid */}
        <div className="space-y-4">
          <h2 className="text-2xl font-extrabold text-slate-900 leading-tight">
            {workshop.title}
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Workshop Level
              </span>
              <span className="font-black text-blue-800 text-xs">
                {workshop.level || 'Foundation'}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Workshop Series
              </span>
              <span className="font-bold text-slate-900">
                {workshop.seriesName || 'Standalone Workshop'}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Date Schedule
              </span>
              <span className="font-bold text-slate-900">
                {workshop.startDate ? `${workshop.startDate}${workshop.endDate ? ` to ${workshop.endDate}` : ''}` : 'Not Scheduled'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Prerequisites
              </span>
              <span className="font-bold text-slate-900">
                {workshop.hasNoPrerequisites ? 'No prerequisite' : workshop.prerequisites || 'None'}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Last Revised
              </span>
              <span className="font-bold text-slate-900">
                {new Date(workshop.updatedAt || Date.now()).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Assigned Faculty Developers */}
        {workshop.assignedDevelopers && workshop.assignedDevelopers.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#002B49] border-b border-slate-200 pb-1">
              Faculty Developers & Workshop Authors
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
              {workshop.assignedDevelopers.map((dev) => (
                <div
                  key={dev.id}
                  className="p-2.5 rounded-lg border border-slate-200 bg-white text-xs"
                >
                  <div className="font-bold text-slate-900">{dev.name}</div>
                  <div className="text-[11px] text-sky-700 font-semibold">{dev.role}</div>
                  <div className="text-[11px] text-slate-500 truncate">{dev.email}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Workshop Description */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#002B49] border-b border-slate-200 pb-1">
            Workshop Overview & Pedagogical Intent
          </h3>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
            {workshop.description || 'No workshop description provided.'}
          </p>
        </div>

        {/* Learning Outcomes */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#002B49] border-b border-slate-200 pb-1 flex items-center justify-between">
            <span>Learning Outcomes (Bloom's Taxonomy)</span>
            <span className="text-[11px] font-medium text-slate-500">
              {workshop.learningOutcomes?.length || 0}/6 outcomes
            </span>
          </h3>

          <div className="space-y-2">
            {(workshop.learningOutcomes || []).map((lo, idx) => (
              <div
                key={lo.id || idx}
                className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/70 text-xs"
              >
                <span className="w-8 h-8 rounded-lg bg-[#002B49] text-white flex items-center justify-center font-extrabold shrink-0 text-xs">
                  {lo.code || `LO${idx + 1}`}
                </span>
                <div className="flex-1">
                  <p className="text-slate-900 font-medium leading-relaxed">{lo.text}</p>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-800 text-[10px] font-bold shrink-0">
                  Bloom: {lo.bloomLevel}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 2-Hour Timeline Structure */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#002B49] border-b border-slate-200 pb-1 flex items-center justify-between">
            <span>2-Hour Workshop Delivery Timeline</span>
            <span className="text-[11px] font-bold text-emerald-700">
              Total: {workshop.totalDurationMinutes || 120} Minutes
            </span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 w-16">Item</th>
                  <th className="py-2.5 px-3">Topic & Subtopics Breakdown</th>
                  <th className="py-2.5 px-3 w-28 text-right">Time Allocated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(workshop.topics || []).map((t, idx) => (
                  <React.Fragment key={t.id || idx}>
                    <tr className="bg-slate-50 font-bold text-slate-900">
                      <td className="py-2.5 px-3">T{idx + 1}</td>
                      <td className="py-2.5 px-3">{t.title}</td>
                      <td className="py-2.5 px-3 text-right">{t.durationMinutes} mins</td>
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
        </div>

        {/* Hands-On Activities */}
        {workshop.activities && workshop.activities.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#002B49] border-b border-slate-200 pb-1">
              Hands-On Experiential Activities & Labs
            </h3>
            <div className="space-y-3">
              {workshop.activities.map((act, idx) => (
                <div
                  key={act.id || idx}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">
                      Activity {idx + 1}: {act.title}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[10px] font-semibold">
                        {act.type}
                      </span>
                      <span className="text-slate-500 font-mono text-[11px]">
                        {act.estimatedMinutes || 20}m
                      </span>
                    </div>
                  </div>
                  {act.description && <p className="text-slate-700">{act.description}</p>}
                  {act.instructions && (
                    <div className="p-2 rounded-lg bg-white border border-slate-200 font-mono text-[11px] text-slate-600">
                      <strong>Facilitator Instructions:</strong> {act.instructions}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resources */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#002B49] border-b border-slate-200 pb-1">
              Required Resources
            </h3>
            {workshop.requiredResources && workshop.requiredResources.length > 0 ? (
              <ul className="space-y-2 text-xs">
                {workshop.requiredResources.map((res, i) => (
                  <li key={i} className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="font-bold text-slate-900">{res.title}</div>
                    {res.description && (
                      <div className="text-slate-600 text-[11px] mt-0.5">{res.description}</div>
                    )}
                    {res.url && (
                      <a
                        href={res.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-700 hover:underline text-[11px] block mt-0.5 truncate"
                      >
                        {res.url}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400 italic">None specified</p>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#002B49] border-b border-slate-200 pb-1">
              Optional Resources
            </h3>
            {workshop.optionalResources && workshop.optionalResources.length > 0 ? (
              <ul className="space-y-2 text-xs">
                {workshop.optionalResources.map((res, i) => (
                  <li key={i} className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="font-bold text-slate-900">{res.title}</div>
                    {res.description && (
                      <div className="text-slate-600 text-[11px] mt-0.5">{res.description}</div>
                    )}
                    {res.url && (
                      <a
                        href={res.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-700 hover:underline text-[11px] block mt-0.5 truncate"
                      >
                        {res.url}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400 italic">None specified</p>
            )}
          </div>
        </div>

        {/* UCW Dimensions of Knowledge Matrix */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#002B49] border-b border-slate-200 pb-1">
            UCW Dimensions of Knowledge Accreditation Matrix
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
            {Object.entries(DIMENSION_LABELS).map(([key, label]) => {
              const rating =
                (workshop.dimensionsOfKnowledge?.[key as keyof typeof workshop.dimensionsOfKnowledge] as DimensionRating) ||
                'r';
              const ratingInfo = RATING_EXPANDED[rating] || RATING_EXPANDED['r'];

              return (
                <div
                  key={key}
                  className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-2"
                >
                  <span className="font-bold text-slate-800 text-[11px]">{label}</span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] border whitespace-nowrap ${ratingInfo.bg}`}
                  >
                    {rating} ({ratingInfo.label})
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pedagogical Content & Equipment Requirements */}
        {(workshop.contentNotes || workshop.instructorNotes || workshop.equipmentRequirements) && (
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#002B49] border-b border-slate-200 pb-1">
              Workshop Materials, Content Notes & Equipment
            </h3>

            {workshop.contentNotes && (
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-1.5">
                <span className="font-bold text-slate-900 block uppercase tracking-wider text-[11px]">
                  Lecture Narrative & Facilitator Scripts
                </span>
                <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">{workshop.contentNotes}</p>
              </div>
            )}

            {workshop.instructorNotes && (
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 text-xs space-y-1.5">
                <span className="font-bold text-amber-900 block uppercase tracking-wider text-[11px]">
                  Instructor Delivery & Cohort Management Guide
                </span>
                <p className="text-amber-950 whitespace-pre-wrap leading-relaxed">{workshop.instructorNotes}</p>
              </div>
            )}

            {workshop.equipmentRequirements && (
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white text-xs space-y-1">
                <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                  Technical Equipment & Software Prerequisites
                </span>
                <p className="text-slate-700 whitespace-pre-wrap">{workshop.equipmentRequirements}</p>
              </div>
            )}
          </div>
        )}

        {/* Institutional Sign-off Footer */}
        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center text-[11px] text-slate-400 gap-2">
          <span>University Canada West • Curriculum & Workshop Quality Assurance</span>
          <span>Verified Document • UCW Workshop Planner</span>
        </div>
      </div>
    </div>
  );
};
