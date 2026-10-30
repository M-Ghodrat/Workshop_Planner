import React from 'react';
import { Layers, AlertCircle, CheckCircle2, BookOpen, AlertTriangle } from 'lucide-react';
import { Workshop, WorkshopSeries } from '../../../types';

interface OverviewTabProps {
  workshop: Workshop;
  setWorkshop: React.Dispatch<React.SetStateAction<Workshop>>;
  allWorkshops: Workshop[];
  allSeries: WorkshopSeries[];
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  workshop,
  setWorkshop,
  allWorkshops,
  allSeries,
}) => {
  const handleSeriesChange = (seriesId: string) => {
    if (seriesId === '') {
      setWorkshop((prev) => ({
        ...prev,
        seriesId: undefined,
        seriesName: undefined,
      }));
    } else {
      const selected = allSeries.find((s) => s.id === seriesId);
      setWorkshop((prev) => ({
        ...prev,
        seriesId,
        seriesName: selected?.name || '',
        prefix: prev.prefix?.trim() ? prev.prefix : (selected?.prefix || '').toUpperCase(),
      }));
    }
  };

  const otherWorkshops = allWorkshops.filter((w) => w.id !== workshop.id);
  const selectedSeriesObj = allSeries.find((s) => s.id === workshop.seriesId);
  const isDeletedSeries = Boolean(workshop.seriesId && !selectedSeriesObj);
  const isUnassignedSeries = !workshop.seriesId || isDeletedSeries;

  return (
    <div className="space-y-6">
      {/* Prominent Workshop Series Track Assignment Section */}
      <div
        className={`rounded-2xl border-2 p-6 shadow-2xs transition-colors ${
          isUnassignedSeries
            ? 'bg-rose-50/70 border-rose-300'
            : 'bg-emerald-50/40 border-emerald-200'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isUnassignedSeries
                  ? 'bg-rose-600 text-white'
                  : 'bg-[#002B49] text-amber-300'
              }`}
            >
              {isUnassignedSeries ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <Layers className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900">
                  Workshop Series Assignment
                </h3>
                {isUnassignedSeries ? (
                  <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider">
                    Action Recommended • Unassigned
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Assigned to {selectedSeriesObj?.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Assign this workshop to its parent UCW Workshop Series right away so it is properly grouped and does not become an unassigned (orphan) workshop.
              </p>
            </div>
          </div>

          <div className="w-full sm:w-80 shrink-0">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Select Workshop Series Track <span className="text-rose-500">*</span>
            </label>
            <select
              value={workshop.seriesId || ''}
              onChange={(e) => handleSeriesChange(e.target.value)}
              className={`w-full px-3.5 py-2.5 text-sm font-bold border-2 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-[#002B49]/20 cursor-pointer ${
                isUnassignedSeries
                  ? 'border-rose-400 text-rose-900'
                  : 'border-[#002B49] text-[#002B49]'
              }`}
            >
              <option value="">-- Select a Workshop Series Track --</option>
              {isDeletedSeries && (
                <option value={workshop.seriesId}>
                  ⚠️ {workshop.seriesName || 'Unknown Series'} (Deleted Series Track)
                </option>
              )}
              {allSeries.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.prefix})
                </option>
              ))}
            </select>
          </div>
        </div>

        {isUnassignedSeries && (
          <div className="mt-4 p-3 rounded-xl bg-rose-100/90 border border-rose-300 text-rose-950 text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              {isDeletedSeries ? (
                <>
                  <strong>Orphan Series Warning:</strong> This workshop&apos;s previous series was deleted. Please select an active Workshop Series above to reassign it.
                </>
              ) : (
                <>
                  <strong>Series Not Selected Yet:</strong> Please choose a Workshop Series above before saving. Saving without a series will flag this workshop with an Orphan Workshop warning in the My Workshops tab.
                </>
              )}
            </span>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-5">
        <div>
          <h3 className="text-base font-bold text-slate-900">Workshop Identification</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Define the official University Canada West workshop code, prefix, and academic title.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Prefix */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Workshop Prefix <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. BUSI, MGMT, TECH"
              value={workshop.prefix}
              onChange={(e) =>
                setWorkshop((prev) => ({ ...prev, prefix: e.target.value.toUpperCase() }))
              }
              className="w-full px-3 py-2 text-sm font-semibold border border-slate-300 rounded-xl uppercase tracking-wider focus:outline-hidden focus:ring-2 focus:ring-[#002B49]/20 focus:border-[#002B49]"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">3-5 letters series/department prefix</span>
          </div>

          {/* Code */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Workshop Code <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 101"
              value={workshop.code}
              onChange={(e) => setWorkshop((prev) => ({ ...prev, code: e.target.value }))}
              className="w-full px-3 py-2 text-sm font-semibold border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#002B49]/20 focus:border-[#002B49]"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">Workshop level number</span>
          </div>
        </div>

        {/* Level, Dates, & Times row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-4">
          {/* Level Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Workshop Level <span className="text-rose-500">*</span>
            </label>
            <select
              value={workshop.level || 'Foundation'}
              onChange={(e) => setWorkshop((prev) => ({ ...prev, level: e.target.value as any }))}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#002B49]/20 focus:border-[#002B49]"
            >
              <option value="Foundation">Foundation</option>
              <option value="Practitioner">Practitioner</option>
              <option value="Professional">Professional</option>
            </select>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Academic difficulty tier
            </span>
          </div>

          {/* Start and End Date */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Workshop Dates
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="date"
                value={workshop.startDate || ''}
                onChange={(e) => setWorkshop((prev) => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#002B49]/20 focus:border-[#002B49]"
              />
              <span className="text-slate-400 text-xs font-bold">to</span>
              <input
                type="date"
                value={workshop.endDate || ''}
                onChange={(e) => setWorkshop((prev) => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#002B49]/20 focus:border-[#002B49]"
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Calendar date range
            </span>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Workshop Title <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Application of AI in Business"
            value={workshop.title}
            onChange={(e) => setWorkshop((prev) => ({ ...prev, title: e.target.value }))}
            className="w-full px-3.5 py-2.5 text-sm font-bold border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#002B49]/20 focus:border-[#002B49] text-slate-900"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Workshop Description
          </label>
          <textarea
            rows={5}
            placeholder="Provide a comprehensive academic overview of the workshop objectives, target student cohort, pedagogical approach, and core takeaways..."
            value={workshop.description}
            onChange={(e) => setWorkshop((prev) => ({ ...prev, description: e.target.value }))}
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#002B49]/20 focus:border-[#002B49] text-slate-800 leading-relaxed"
          />
        </div>
      </div>

      {/* Prerequisites Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Academic Prerequisites</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Specify workshop or knowledge prerequisites required before taking this 2-hour workshop.
          </p>
        </div>

        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
          <input
            type="checkbox"
            id="no-prereq-check"
            checked={workshop.hasNoPrerequisites || false}
            onChange={(e) => {
              const isChecked = e.target.checked;
              setWorkshop((prev) => ({
                ...prev,
                hasNoPrerequisites: isChecked,
                prerequisites: isChecked ? 'No prerequisite' : '',
              }));
            }}
            className="w-4 h-4 text-[#002B49] rounded-md border-slate-300 focus:ring-[#002B49] cursor-pointer"
          />
          <label htmlFor="no-prereq-check" className="text-xs font-bold text-slate-800 cursor-pointer">
            No prerequisite required (Open to all eligible UCW students)
          </label>
        </div>

        {!workshop.hasNoPrerequisites && (
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select from existing UCW Workshops:
              </label>
              <select
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) return;
                  const current = workshop.prerequisites || '';
                  const next = current ? `${current}, ${val}` : val;
                  setWorkshop((prev) => ({ ...prev, prerequisites: next }));
                }}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
              >
                <option value="">-- Choose a prerequisite workshop to append --</option>
                {otherWorkshops.map((w) => (
                  <option key={w.id} value={`${w.prefix} ${w.code} (${w.title})`}>
                    {w.prefix} {w.code} — {w.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Or enter custom prerequisite notes:
              </label>
              <input
                type="text"
                placeholder="e.g. BUSI 650 or equivalent foundational statistics knowledge"
                value={workshop.prerequisites || ''}
                onChange={(e) => setWorkshop((prev) => ({ ...prev, prerequisites: e.target.value }))}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 text-slate-800"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
