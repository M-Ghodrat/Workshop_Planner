import React from 'react';
import {
  GraduationCap,
  Clock,
  Lightbulb,
  Bookmark,
  Award,
  FileText,
  Users,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Edit3,
  Copy,
  Printer,
  Check,
} from 'lucide-react';
import { Workshop, DimensionRating, Material } from '../../../types';
import { useToast } from '../../../context/ToastContext';

interface FullOverviewTabProps {
  workshop: Workshop;
  materials?: Material[];
  onNavigateToSection?: (sectionId: string) => void;
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

export const FullOverviewTab: React.FC<FullOverviewTabProps> = ({
  workshop,
  materials = [],
  onNavigateToSection,
  onOpenMaterialPreview,
}) => {
  const { success } = useToast();
  const [copied, setCopied] = React.useState(false);

  const attachedMaterials = materials.filter((m) => m.workshopId === workshop.id);
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
Required: ${(workshop.requiredResources || []).map((r) => r.title).join(', ') || 'None'}
Optional: ${(workshop.optionalResources || []).map((r) => r.title).join(', ') || 'None'}

6. FACULTY DEVELOPERS:
${(workshop.assignedDevelopers || []).map((d) => `- ${d.name} (${d.role})`).join('\n')}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    success('Summary Copied', 'Full workshop specification copied to clipboard.');
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="space-y-8">
      {/* Read-Only Notice Banner */}
      <div className="bg-slate-900 text-white p-5 sm:p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950">
              Read-Only View
            </span>
            <h3 className="text-base font-black tracking-tight">
              Complete Workshop Outline Specification
            </h3>
          </div>
          <p className="text-xs text-slate-300">
            This compiled overview aggregates all sections into a single comprehensive review document.
            Click any section in the Table of Contents or any edit link below to modify individual items.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyText}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer border border-slate-700"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-950 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-blue-600" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Main Aggregated Document Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10 space-y-10">
        
        {/* Section 01: Core Information & Overview */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-slate-950 text-white flex items-center justify-center text-xs font-black">
                01
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-950 uppercase tracking-tight flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>General Overview & Classification</span>
              </h2>
            </div>
            {onNavigateToSection && (
              <button
                type="button"
                onClick={() => onNavigateToSection('overview')}
                className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Section</span>
              </button>
            )}
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
                {workshop.startDate ? `${workshop.startDate}${workshop.endDate ? ` to ${workshop.endDate}` : ''}` : 'Not Scheduled'}
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
              <span className="w-7 h-7 rounded-lg bg-slate-950 text-white flex items-center justify-center text-xs font-black">
                02
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-950 uppercase tracking-tight flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-emerald-600" />
                <span>Learning Outcomes ({workshop.learningOutcomes?.length || 0})</span>
              </h2>
            </div>
            {onNavigateToSection && (
              <button
                type="button"
                onClick={() => onNavigateToSection('outcomes')}
                className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Section</span>
              </button>
            )}
          </div>

          {(!workshop.learningOutcomes || workshop.learningOutcomes.length === 0) ? (
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
              <span className="w-7 h-7 rounded-lg bg-slate-950 text-white flex items-center justify-center text-xs font-black">
                03
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-950 uppercase tracking-tight flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>2-Hour Workshop Delivery Timeline ({totalMinutes}/120 Mins)</span>
              </h2>
            </div>
            {onNavigateToSection && (
              <button
                type="button"
                onClick={() => onNavigateToSection('timeline')}
                className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Section</span>
              </button>
            )}
          </div>

          {(!workshop.topics || workshop.topics.length === 0) ? (
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
              <span className="w-7 h-7 rounded-lg bg-slate-950 text-white flex items-center justify-center text-xs font-black">
                04
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-950 uppercase tracking-tight flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-purple-600" />
                <span>Experiential Activities & Labs ({workshop.activities?.length || 0})</span>
              </h2>
            </div>
            {onNavigateToSection && (
              <button
                type="button"
                onClick={() => onNavigateToSection('activities')}
                className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Section</span>
              </button>
            )}
          </div>

          {(!workshop.activities || workshop.activities.length === 0) ? (
            <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
              No hands-on activities specified yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {workshop.activities.map((act, idx) => (
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
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section 05: Resources */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-slate-950 text-white flex items-center justify-center text-xs font-black">
                05
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-950 uppercase tracking-tight flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-sky-600" />
                <span>Required & Optional Resources</span>
              </h2>
            </div>
            {onNavigateToSection && (
              <button
                type="button"
                onClick={() => onNavigateToSection('resources')}
                className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Section</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Required Resources ({workshop.requiredResources?.length || 0})
              </h4>
              {workshop.requiredResources && workshop.requiredResources.length > 0 ? (
                <div className="space-y-2">
                  {workshop.requiredResources.map((res, i) => (
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
                Optional Resources ({workshop.optionalResources?.length || 0})
              </h4>
              {workshop.optionalResources && workshop.optionalResources.length > 0 ? (
                <div className="space-y-2">
                  {workshop.optionalResources.map((res, i) => (
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
              <span className="w-7 h-7 rounded-lg bg-slate-950 text-white flex items-center justify-center text-xs font-black">
                06
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-950 uppercase tracking-tight flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <span>UCW Dimensions of Knowledge Matrix</span>
              </h2>
            </div>
            {onNavigateToSection && (
              <button
                type="button"
                onClick={() => onNavigateToSection('dimensions')}
                className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Section</span>
              </button>
            )}
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
              <span className="w-7 h-7 rounded-lg bg-slate-950 text-white flex items-center justify-center text-xs font-black">
                07
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-950 uppercase tracking-tight flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Materials & Pedagogical Content ({attachedMaterials.length} files)</span>
              </h2>
            </div>
            {onNavigateToSection && (
              <button
                type="button"
                onClick={() => onNavigateToSection('materials')}
                className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Section</span>
              </button>
            )}
          </div>

          {/* Lecture Script / Content Notes */}
          {workshop.contentNotes && (
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 text-xs space-y-1.5">
              <div className="font-black text-slate-950 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                <span>Lecture Narrative & Facilitator Scripts</span>
              </div>
              <pre className="text-slate-800 font-sans text-xs whitespace-pre-wrap leading-relaxed">
                {workshop.contentNotes}
              </pre>
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
              <span className="w-7 h-7 rounded-lg bg-slate-950 text-white flex items-center justify-center text-xs font-black">
                08
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-950 uppercase tracking-tight flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-600" />
                <span>Faculty Developers & Contributors ({workshop.assignedDevelopers?.length || 0})</span>
              </h2>
            </div>
            {onNavigateToSection && (
              <button
                type="button"
                onClick={() => onNavigateToSection('collaborators')}
                className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Section</span>
              </button>
            )}
          </div>

          {(!workshop.assignedDevelopers || workshop.assignedDevelopers.length === 0) ? (
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

      </div>
    </div>
  );
};
