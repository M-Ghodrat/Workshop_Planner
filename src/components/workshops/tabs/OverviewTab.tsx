import React from 'react';
import { Layers, AlertCircle, CheckCircle2, BookOpen } from 'lucide-react';
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
      }));
    }
  };

  const otherWorkshops = allWorkshops.filter((w) => w.id !== workshop.id);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-5">
        <div>
          <h3 className="text-base font-bold text-slate-900">Workshop Identification</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Define the official University Canada West workshop code, prefix, and academic title.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <span className="text-[10px] text-slate-400 mt-1 block">3-4 letters department prefix</span>
          </div>

          {/* Code */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Workshop Code <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 654"
              value={workshop.code}
              onChange={(e) => setWorkshop((prev) => ({ ...prev, code: e.target.value }))}
              className="w-full px-3 py-2 text-sm font-semibold border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#002B49]/20 focus:border-[#002B49]"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">Workshop level number</span>
          </div>

          {/* Workshop Series Association */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Workshop Series
            </label>
            <select
              value={workshop.seriesId || ''}
              onChange={(e) => handleSeriesChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#002B49]/20 focus:border-[#002B49]"
            >
              <option value="">Standalone Workshop (No Series)</option>
              {allSeries.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Curriculum track association
            </span>
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
