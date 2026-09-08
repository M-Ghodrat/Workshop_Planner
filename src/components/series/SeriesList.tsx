import React, { useState, useMemo } from 'react';
import {
  Layers,
  Plus,
  Edit,
  Trash2,
  BookOpen,
  Eye,
  Clock,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Search,
  User,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { seriesService } from '../../services/seriesService';
import { WorkshopSeries, Workshop } from '../../types';

interface SeriesListProps {
  series: WorkshopSeries[];
  workshops: Workshop[];
  onSelectWorkshop: (workshop: Workshop, mode: 'edit' | 'preview') => void;
  onOpenCreateWorkshop: () => void;
}

export const SeriesList: React.FC<SeriesListProps> = ({
  series = [],
  workshops = [],
  onSelectWorkshop,
  onOpenCreateWorkshop,
}) => {
  const { userProfile, isAdmin } = useAuth();
  const { success, error } = useToast();

  const safeSeries = Array.isArray(series) ? series : [];
  const safeWorkshops = Array.isArray(workshops) ? workshops : [];

  const userId = userProfile?.id || '';

  // For developers, only consider workshops they created or are assigned to
  const accessibleWorkshops = useMemo(() => {
    if (isAdmin) return safeWorkshops;
    return safeWorkshops.filter(
      (w) =>
        w.createdBy === userId ||
        (Array.isArray(w.assignedDeveloperIds) && w.assignedDeveloperIds.includes(userId))
    );
  }, [safeWorkshops, isAdmin, userId]);

  // For developers, only show series that contain their workshops or that they created
  const scopedSeries = useMemo(() => {
    if (isAdmin) return safeSeries;
    const devSeriesIds = new Set(accessibleWorkshops.map((w) => w.seriesId).filter(Boolean));
    return safeSeries.filter((s) => devSeriesIds.has(s.id) || s.createdBy === userId);
  }, [safeSeries, accessibleWorkshops, isAdmin, userId]);

  const [searchTerm, setSearchTerm] = useState('');
  const [editingSeries, setEditingSeries] = useState<WorkshopSeries | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedSeriesForView, setSelectedSeriesForView] = useState<WorkshopSeries | null>(
    scopedSeries[0] || null
  );

  // Keep selected series updated if series change and none is selected
  React.useEffect(() => {
    if (
      (!selectedSeriesForView || !scopedSeries.some((s) => s.id === selectedSeriesForView.id)) &&
      scopedSeries.length > 0
    ) {
      setSelectedSeriesForView(scopedSeries[0]);
    } else if (scopedSeries.length === 0) {
      setSelectedSeriesForView(null);
    }
  }, [scopedSeries, selectedSeriesForView]);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coreFocus, setCoreFocus] = useState('');
  const [prefix, setPrefix] = useState('');
  const [status, setStatus] = useState<'Active' | 'Draft' | 'Archived'>('Active');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenCreate = () => {
    setName('');
    setDescription('');
    setCoreFocus('');
    setPrefix('');
    setStatus('Active');
    setEditingSeries(null);
    setIsCreating(true);
  };

  const handleOpenEdit = (s: WorkshopSeries) => {
    setName(s.name);
    setDescription(s.description);
    setCoreFocus(s.coreFocus);
    setPrefix(s.prefix || '');
    setStatus(s.status);
    setEditingSeries(s);
    setIsCreating(true);
  };

  const handleSaveSeries = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !userProfile) return;

    setIsSubmitting(true);
    try {
      if (editingSeries && editingSeries.id) {
        await seriesService.updateSeries(editingSeries.id, {
          name: name.trim(),
          description: description.trim(),
          coreFocus: coreFocus.trim(),
          prefix: prefix.trim().toUpperCase(),
          status,
        });
        success('Series Updated', `"${name}" updated successfully.`);
      } else {
        await seriesService.createSeries(
          {
            name: name.trim(),
            description: description.trim(),
            coreFocus: coreFocus.trim(),
            prefix: prefix.trim().toUpperCase(),
            status,
            workshopIds: [],
          },
          userProfile
        );
        success('Series Created', `"${name}" initialized.`);
      }
      setIsCreating(false);
      setEditingSeries(null);
    } catch (err: any) {
      error('Series Save Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSeries = async (s: WorkshopSeries) => {
    if (!s.id || !window.confirm(`Delete workshop series "${s.name}"?`)) return;
    try {
      await seriesService.deleteSeries(s.id);
      success('Series Deleted', `"${s.name}" was removed.`);
      if (selectedSeriesForView?.id === s.id) {
        setSelectedSeriesForView(null);
      }
    } catch (err: any) {
      error('Delete Failed', err.message);
    }
  };

  const filteredSeries = scopedSeries.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.coreFocus?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.prefix?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Workshop Series Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {isAdmin
              ? 'Organize UCW workshops into cohesive thematic tracks and executive leadership certificate series.'
              : 'Curriculum series tracks associated with your assigned and authored workshops.'}
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#002B49] hover:bg-[#003d66] text-white text-xs font-bold shadow-md transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 text-amber-400" />
          <span>New Workshop Series</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search series by title, core focus, or department prefix..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
          />
        </div>
      </div>

      {/* Series Grid & Detail Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: List of Series Cards */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
            Series Tracks ({filteredSeries.length})
          </h3>

          {filteredSeries.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-300 text-xs text-slate-400">
              {scopedSeries.length === 0
                ? 'No workshop series associated with your workshops yet.'
                : 'No series matching search criteria.'}
            </div>
          ) : (
            filteredSeries.map((s) => {
              const isSelected = selectedSeriesForView?.id === s.id;
              const seriesWorkshops = accessibleWorkshops.filter((w) => w.seriesId === s.id);

              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedSeriesForView(s)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'bg-white border-[#002B49] shadow-md ring-2 ring-[#002B49]/10'
                      : 'bg-white border-slate-200 hover:border-sky-300 shadow-2xs hover:bg-sky-50/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-[#002B49] text-amber-300 text-[10px] font-extrabold">
                        {s.prefix || 'UCW'}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 leading-snug">{s.name}</h4>
                    </div>

                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        s.status === 'Active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                    {s.coreFocus || s.description}
                  </p>

                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 text-xs">
                    <span className="font-semibold text-slate-500 flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-sky-600" />
                      <span>{seriesWorkshops.length} workshops</span>
                    </span>

                    <div
                      className="flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleOpenEdit(s)}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
                        title="Edit Series"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteSeries(s)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-md cursor-pointer"
                          title="Delete Series"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right 2 Columns: Selected Series Detail View */}
        <div className="lg:col-span-2">
          {selectedSeriesForView ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded-md bg-[#002B49] text-white text-xs font-extrabold">
                      {selectedSeriesForView.prefix || 'UCW'}
                    </span>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      {selectedSeriesForView.status}
                    </span>
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-900">
                    {selectedSeriesForView.name}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(selectedSeriesForView)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit Series Info</span>
                  </button>
                  <button
                    onClick={onOpenCreateWorkshop}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#002B49] text-white text-xs font-semibold hover:bg-sky-900 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-400" />
                    <span>Add Workshop</span>
                  </button>
                </div>
              </div>

              {/* Core Focus & Description */}
              <div className="space-y-3 text-xs sm:text-sm">
                <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-950">
                  <span className="font-extrabold text-xs uppercase tracking-wider text-amber-800 block mb-0.5">
                    Core Curriculum Focus
                  </span>
                  <p className="leading-relaxed">{selectedSeriesForView.coreFocus}</p>
                </div>

                <div>
                  <span className="font-bold text-slate-700 text-xs block mb-1">
                    Series Syllabus & Objectives:
                  </span>
                  <p className="text-slate-600 leading-relaxed">
                    {selectedSeriesForView.description}
                  </p>
                </div>
              </div>

              {/* Workshops Belonging to This Series */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Workshops in this Series (
                  {accessibleWorkshops.filter((w) => w.seriesId === selectedSeriesForView.id).length})
                </h4>

                {accessibleWorkshops.filter((w) => w.seriesId === selectedSeriesForView.id).length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
                    No workshops assigned to this series yet.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {accessibleWorkshops
                      .filter((w) => w.seriesId === selectedSeriesForView.id)
                      .map((w, idx) => {
                        const devList =
                          w.assignedDevelopers && w.assignedDevelopers.length > 0
                            ? w.assignedDevelopers
                            : w.createdByName
                            ? [{ id: w.createdBy || 'creator', name: w.createdByName, email: '' }]
                            : [];

                        return (
                          <div
                            key={w.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-sky-50/40 hover:border-sky-300 transition-all gap-3"
                          >
                            <div className="flex items-start sm:items-center gap-3 min-w-0">
                              <span className="w-7 h-7 rounded-lg bg-[#002B49] text-white flex items-center justify-center font-extrabold text-xs shrink-0 shadow-2xs mt-0.5 sm:mt-0">
                                {idx + 1}
                              </span>
                              <div className="min-w-0 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-slate-900 text-xs truncate">
                                    {w.prefix} {w.code}: {w.title}
                                  </span>
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 shrink-0">
                                    {w.status}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2.5 flex-wrap text-[11px] text-slate-500">
                                  <span className="text-slate-400">
                                    {w.totalDurationMinutes || 120} mins •{' '}
                                    {w.learningOutcomes?.length || 0} Learning Outcomes
                                  </span>

                                  {/* Developer Small Tag(s) */}
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {devList.length > 0 ? (
                                      devList.map((dev) => (
                                        <span
                                          key={dev.id}
                                          title={dev.email ? `${dev.name} (${dev.email})` : dev.name}
                                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200/70 text-slate-800 text-[10px] font-medium border border-slate-200 transition-colors shrink-0"
                                        >
                                          <span className="w-3.5 h-3.5 rounded-full bg-[#002B49] text-white flex items-center justify-center text-[8px] font-bold">
                                            {dev.name?.charAt(0) || 'D'}
                                          </span>
                                          <span className="truncate max-w-[120px]">{dev.name}</span>
                                        </span>
                                      ))
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100/80 text-slate-400 text-[10px] italic border border-slate-200/80 shrink-0">
                                        <User className="w-2.5 h-2.5" />
                                        <span>No developer assigned</span>
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                              <button
                                onClick={() => onSelectWorkshop(w, 'preview')}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white transition-colors cursor-pointer"
                                title="Preview"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onSelectWorkshop(w, 'edit')}
                                className="px-2.5 py-1 rounded-lg bg-[#002B49] text-white text-xs font-semibold hover:bg-sky-900 transition-colors cursor-pointer"
                              >
                                Open
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold">Select a series to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Series Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {editingSeries ? 'Edit Workshop Series' : 'Create New Workshop Series'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Group related 2-hour workshops into an accredited executive sequence.
            </p>

            <form onSubmit={handleSaveSeries} className="space-y-3.5">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Series Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AI and Machine Learning Leadership"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm font-semibold border border-slate-300 rounded-xl focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Prefix</label>
                  <input
                    type="text"
                    required
                    placeholder="BUSI"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs sm:text-sm font-semibold border border-slate-300 rounded-xl uppercase focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Core Focus Summary <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Developing strategic leadership capabilities for AI in executive management."
                  value={coreFocus}
                  onChange={(e) => setCoreFocus(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Series Description & Rationale
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide pedagogical background, intended cohort, certificate outcomes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-hidden"
                >
                  <option value="Active">Active</option>
                  <option value="Draft">Draft</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#002B49] hover:bg-[#003d66] rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingSeries ? 'Save Changes' : 'Create Series'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
