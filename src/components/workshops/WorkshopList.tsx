import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  BookOpen,
  PlusCircle,
  Clock,
  Layers,
  Users,
  Edit,
  Eye,
  Trash2,
  CheckCircle2,
  Grid,
  List,
  ChevronDown,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { workshopService } from '../../services/workshopService';
import { Workshop, WorkshopSeries, WorkshopStatus, UserProfile } from '../../types';

interface WorkshopListProps {
  workshops: Workshop[];
  series: WorkshopSeries[];
  users: UserProfile[];
  onOpenCreateWorkshop: () => void;
  onSelectWorkshop: (workshop: Workshop, mode: 'edit' | 'preview') => void;
  viewMode?: 'my' | 'all';
}

export const WorkshopList: React.FC<WorkshopListProps> = ({
  workshops = [],
  series = [],
  users = [],
  onOpenCreateWorkshop,
  onSelectWorkshop,
  viewMode = 'all',
}) => {
  const { userProfile, isAdmin } = useAuth();
  const { success, error } = useToast();

  const safeWorkshops = Array.isArray(workshops) ? workshops : [];
  const safeSeries = Array.isArray(series) ? series : [];
  const safeUsers = Array.isArray(users) ? users : [];

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeries, setSelectedSeries] = useState<string>('all');
  const [selectedDeveloper, setSelectedDeveloper] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'updated' | 'title' | 'code'>('updated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'table'>('grid');

  // Deletion modal state
  const [deletingWorkshop, setDeletingWorkshop] = useState<Workshop | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const userId = userProfile?.id || '';

  // Base list: Developers only see their own assigned or created workshops
  const baseList = useMemo(() => {
    if (!isAdmin) {
      return safeWorkshops.filter(
        (w) =>
          w.createdBy === userId ||
          (Array.isArray(w.assignedDeveloperIds) && w.assignedDeveloperIds.includes(userId))
      );
    }
    return safeWorkshops;
  }, [safeWorkshops, isAdmin, userId]);

  // Series available to this developer (only series that developer's workshops belong to, or all for admin)
  const availableSeries = useMemo(() => {
    if (isAdmin) return safeSeries;
    const devSeriesIds = new Set(baseList.map((w) => w.seriesId).filter(Boolean));
    return safeSeries.filter((s) => devSeriesIds.has(s.id) || s.createdBy === userId);
  }, [isAdmin, safeSeries, baseList, userId]);

  // Filter and Sort
  const filteredWorkshops = useMemo(() => {
    return baseList
      .filter((w) => {
        // Search filter
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchTitle = w.title?.toLowerCase().includes(term);
          const matchCode = `${w.prefix || ''} ${w.code || ''}`.toLowerCase().includes(term);
          const matchSeries = w.seriesName?.toLowerCase().includes(term);
          const matchDesc = w.description?.toLowerCase().includes(term);
          const matchDevs = w.assignedDevelopers?.some(
            (d) => d.name?.toLowerCase().includes(term) || d.email?.toLowerCase().includes(term)
          );
          if (!matchTitle && !matchCode && !matchSeries && !matchDesc && !matchDevs) {
            return false;
          }
        }

        // Series filter
        if (selectedSeries !== 'all' && w.seriesId !== selectedSeries) {
          return false;
        }

        // Developer filter
        if (selectedDeveloper !== 'all') {
          const hasDev =
            w.createdBy === selectedDeveloper ||
            (Array.isArray(w.assignedDeveloperIds) && w.assignedDeveloperIds.includes(selectedDeveloper));
          if (!hasDev) return false;
        }

        // Status filter
        if (selectedStatus !== 'all' && w.status !== selectedStatus) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        let comparison = 0;
        if (sortBy === 'title') {
          comparison = (a.title || '').localeCompare(b.title || '');
        } else if (sortBy === 'code') {
          const codeA = `${a.prefix} ${a.code}`;
          const codeB = `${b.prefix} ${b.code}`;
          comparison = codeA.localeCompare(codeB);
        } else {
          // updated
          const timeA = new Date(a.updatedAt || 0).getTime();
          const timeB = new Date(b.updatedAt || 0).getTime();
          comparison = timeA - timeB;
        }
        return sortOrder === 'desc' ? -comparison : comparison;
      });
  }, [baseList, searchTerm, selectedSeries, selectedDeveloper, selectedStatus, sortBy, sortOrder]);

  const handleDelete = async () => {
    if (!deletingWorkshop?.id) return;
    setIsDeleting(true);
    try {
      await workshopService.deleteWorkshop(deletingWorkshop.id);
      success('Workshop Deleted', `${deletingWorkshop.prefix} ${deletingWorkshop.code} was removed.`);
      setDeletingWorkshop(null);
    } catch (err: any) {
      error('Delete Failed', err.message || 'Unable to delete workshop.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStatusChange = async (workshop: Workshop, newStatus: WorkshopStatus) => {
    if (!workshop.id || !userProfile) return;
    try {
      await workshopService.updateStatus(workshop.id, newStatus, userProfile);
      success('Status Updated', `${workshop.prefix} ${workshop.code} is now marked as "${newStatus}".`);
    } catch (err: any) {
      error('Failed to update status', err.message);
    }
  };

  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    'In Development': { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300' },
    Review: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-300' },
    Approved: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-300' },
  };

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {isAdmin ? 'All University Workshops' : 'My Assigned Workshops'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {isAdmin
              ? 'Complete University Canada West curriculum repository across all departments'
              : 'Workshops you have created or are collaborating on as an instructor/developer'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Layout Toggle */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-2xs">
            <button
              onClick={() => setLayoutMode('grid')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                layoutMode === 'grid' ? 'bg-[#002B49] text-white' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLayoutMode('table')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                layoutMode === 'table' ? 'bg-[#002B49] text-white' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {!isAdmin && (
            <button
              onClick={onOpenCreateWorkshop}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#002B49] hover:bg-[#003d66] text-white text-xs font-bold shadow-md transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-amber-400" />
              <span>Create Workshop</span>
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by title, workshop code (e.g. BUSI 654), description, or developer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 transition-all"
            />
          </div>

          {/* Series Filter */}
          <div className="w-full md:w-52">
            <select
              value={selectedSeries}
              onChange={(e) => setSelectedSeries(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-800 bg-slate-50 hover:bg-slate-100/70 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
            >
              <option value="all">
                {isAdmin ? 'All Workshop Series' : 'My Workshop Series'}
              </option>
              {availableSeries.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Developer Filter (Admin only) */}
          {isAdmin && (
            <div className="w-full md:w-48">
              <select
                value={selectedDeveloper}
                onChange={(e) => setSelectedDeveloper(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-800 bg-slate-50 hover:bg-slate-100/70 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
              >
                <option value="all">All Developers</option>
                {safeUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.displayName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status Filter */}
          <div className="w-full md:w-44">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-800 bg-slate-50 hover:bg-slate-100/70 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
            >
              <option value="all">All Statuses</option>
              <option value="In Development">In Development</option>
              <option value="Review">Review</option>
              <option value="Approved">Approved</option>
            </select>
          </div>

          {/* Sort Controls */}
          <div className="flex items-center gap-1.5">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-800 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
            >
              <option value="updated">Sort by Last Updated</option>
              <option value="title">Sort by Title</option>
              <option value="code">Sort by Workshop Code</option>
            </select>
            <button
              onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              title={`Switch to ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Summary Tags */}
        {(searchTerm || selectedSeries !== 'all' || selectedDeveloper !== 'all' || selectedStatus !== 'all') && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs flex-wrap">
            <span className="text-slate-400 font-medium">Active filters:</span>
            {searchTerm && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                Keyword: "{searchTerm}"
                <button onClick={() => setSearchTerm('')} className="hover:text-rose-600 font-bold ml-1">
                  ×
                </button>
              </span>
            )}
            {selectedSeries !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200">
                Series: {series.find((s) => s.id === selectedSeries)?.name}
                <button onClick={() => setSelectedSeries('all')} className="hover:text-rose-600 font-bold ml-1">
                  ×
                </button>
              </span>
            )}
            {selectedStatus !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 text-sky-900 border border-sky-200">
                Status: {selectedStatus}
                <button onClick={() => setSelectedStatus('all')} className="hover:text-rose-600 font-bold ml-1">
                  ×
                </button>
              </span>
            )}
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedSeries('all');
                setSelectedDeveloper('all');
                setSelectedStatus('all');
              }}
              className="text-sky-700 hover:underline font-semibold ml-auto"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* Workshop Count Bar */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Showing <strong>{filteredWorkshops.length}</strong> of {baseList.length} workshops
        </span>
      </div>

      {/* Main Listing */}
      {filteredWorkshops.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-2xs">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No matching workshops found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
            {isAdmin
              ? 'Try adjusting your search query or clearing active filters.'
              : 'Try adjusting your search query, clearing filters, or create a new 2-hour workshop outline.'}
          </p>
          {!isAdmin && (
            <button
              onClick={onOpenCreateWorkshop}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#002B49] text-white text-xs font-bold hover:bg-[#003d66] shadow-xs cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-amber-400" />
              <span>Create New Workshop</span>
            </button>
          )}
        </div>
      ) : layoutMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredWorkshops.map((w) => {
            const style = statusColors[w.status] || statusColors['In Development'];
            const canDelete = isAdmin || w.createdBy === userId;

            return (
              <div
                key={w.id}
                className="group bg-white rounded-2xl border border-slate-200 hover:border-sky-400 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
              >
                <div>
                  {/* Card Top Banner */}
                  <div className="p-4 bg-slate-50/60 border-b border-slate-100 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-12 h-12 rounded-xl bg-[#002B49] text-white flex flex-col items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                        <span className="text-[10px] text-amber-300 leading-none">{w.prefix}</span>
                        <span className="text-sm leading-tight">{w.code}</span>
                      </div>
                      <div>
                        <span className="text-[11px] font-extrabold text-[#002B49] tracking-wide flex items-center gap-1.5">
                          <span>{w.prefix} {w.code}</span>
                          <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-900 font-extrabold text-[9px] uppercase tracking-wider">
                            {w.level || 'Foundation'}
                          </span>
                        </span>
                        {w.seriesName && (
                          <p className="text-[10px] text-slate-500 font-medium truncate max-w-[170px]">
                            {w.seriesName}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Status Dropdown */}
                    {isAdmin ? (
                      <select
                        value={w.status}
                        onChange={(e) => handleStatusChange(w, e.target.value as WorkshopStatus)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${style.bg} ${style.text} ${style.border} focus:outline-hidden cursor-pointer`}
                      >
                        <option value="In Development">In Development</option>
                        <option value="Review">Review</option>
                        <option value="Approved">Approved</option>
                      </select>
                    ) : (
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${style.bg} ${style.text} ${style.border}`}
                      >
                        {w.status}
                      </span>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="p-4 space-y-3">
                    <h3
                      onClick={() => onSelectWorkshop(w, 'edit')}
                      className="text-sm font-bold text-slate-900 group-hover:text-[#002B49] transition-colors cursor-pointer line-clamp-2 leading-snug"
                    >
                      {w.title}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                      {w.description || 'No detailed workshop description provided yet.'}
                    </p>

                    {/* Schedule Info if present */}
                    {w.startDate && (
                      <div className="text-[10px] text-slate-500 font-semibold flex flex-wrap gap-x-2 gap-y-1 bg-amber-50 border border-amber-200/40 p-2 rounded-lg">
                        <span className="flex items-center gap-1">
                          <span className="font-bold text-amber-800">Date:</span> {w.startDate}{w.endDate ? ` to ${w.endDate}` : ''}
                        </span>
                      </div>
                    )}

                    {/* Meta stats badges */}
                    <div className="grid grid-cols-3 gap-2 py-2 px-2.5 bg-slate-50 rounded-xl text-[11px] text-slate-600 font-medium">
                      <div className="text-center">
                        <span className="text-[10px] text-slate-400 block">Duration</span>
                        <span className="font-bold text-slate-800">{w.totalDurationMinutes || 120}m</span>
                      </div>
                      <div className="text-center border-x border-slate-200">
                        <span className="text-[10px] text-slate-400 block">Outcomes</span>
                        <span className="font-bold text-slate-800">
                          {w.learningOutcomes?.length || 0}/6
                        </span>
                      </div>
                      <div className="text-center">
                        <span className="text-[10px] text-slate-400 block">Activities</span>
                        <span className="font-bold text-slate-800">{w.activities?.length || 0}</span>
                      </div>
                    </div>

                    {/* Assigned Developers Avatars */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Developers / Instructors
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {w.assignedDevelopers && w.assignedDevelopers.length > 0 ? (
                          w.assignedDevelopers.map((dev) => (
                            <span
                              key={dev.id}
                              title={`${dev.name} (${dev.email})`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[10px] font-medium border border-slate-200"
                            >
                              <span className="w-3.5 h-3.5 rounded-full bg-[#002B49] text-white flex items-center justify-center text-[8px] font-bold">
                                {dev.name?.charAt(0) || 'D'}
                              </span>
                              <span className="truncate max-w-[100px]">{dev.name}</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No instructors assigned</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="p-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onSelectWorkshop(w, 'preview')}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white hover:text-slate-900 transition-colors cursor-pointer"
                      title="Preview Document"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {canDelete && (
                      <button
                        disabled={w.status !== 'In Development'}
                        onClick={() => {
                          if (w.status === 'In Development') {
                            setDeletingWorkshop(w);
                          }
                        }}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          w.status === 'In Development'
                            ? 'border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer'
                            : 'border-slate-100 text-slate-300 bg-slate-50 cursor-not-allowed opacity-50'
                        }`}
                        title={
                          w.status === 'In Development'
                            ? 'Delete Workshop'
                            : 'Delete is only active when workshop is in "In Development" status'
                        }
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => onSelectWorkshop(w, 'edit')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#002B49] hover:bg-[#003d66] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5 text-amber-300" />
                    <span>Edit Outline</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Series</th>
                  <th className="py-3 px-4">Instructors / Developers</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Updated</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredWorkshops.map((w) => {
                  const style = statusColors[w.status] || statusColors['In Development'];
                  const canDelete = isAdmin || w.createdBy === userId;

                  return (
                    <tr key={w.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                        <span className="px-2 py-1 rounded-md bg-[#002B49] text-white font-extrabold text-[11px]">
                          {w.prefix} {w.code}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div
                          onClick={() => onSelectWorkshop(w, 'edit')}
                          className="font-bold text-slate-900 hover:text-sky-800 cursor-pointer line-clamp-1"
                        >
                          {w.title}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{w.totalDurationMinutes || 120} mins</span>
                          <span>•</span>
                          <span>{w.learningOutcomes?.length || 0} LOs</span>
                          <span>•</span>
                          <span className="px-1 py-0.5 rounded bg-blue-50 text-blue-800 text-[10px] font-extrabold uppercase">{w.level || 'Foundation'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <div className="font-medium">{w.seriesName || <span className="text-slate-400 italic">—</span>}</div>
                        {w.startDate && (
                          <div className="text-[10px] text-slate-400 mt-1 space-y-0.5 leading-none">
                            <div>Date: {w.startDate}{w.endDate ? ` to ${w.endDate}` : ''}</div>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 flex-wrap max-w-xs">
                          {w.assignedDevelopers?.map((dev) => (
                            <span
                              key={dev.id}
                              className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium"
                            >
                              {dev.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${style.bg} ${style.text} ${style.border}`}
                        >
                          {w.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap text-[11px]">
                        {new Date(w.updatedAt || Date.now()).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onSelectWorkshop(w, 'preview')}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Preview Document"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onSelectWorkshop(w, 'edit')}
                            className="px-2.5 py-1 rounded-lg bg-[#002B49] text-white text-xs font-semibold hover:bg-sky-900 transition-colors cursor-pointer"
                          >
                            Edit
                          </button>
                          {canDelete && (
                            <button
                              disabled={w.status !== 'In Development'}
                              onClick={() => {
                                if (w.status === 'In Development') {
                                  setDeletingWorkshop(w);
                                }
                              }}
                              className={`p-1.5 rounded-lg transition-colors ${
                                w.status === 'In Development'
                                  ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer'
                                  : 'text-slate-300 bg-slate-50 cursor-not-allowed opacity-50'
                              }`}
                              title={
                                w.status === 'In Development'
                                  ? 'Delete'
                                  : 'Delete is only active when workshop is in "In Development" status'
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingWorkshop && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900">Delete Workshop Outline?</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Are you sure you want to delete{' '}
              <strong>
                {deletingWorkshop.prefix} {deletingWorkshop.code} — {deletingWorkshop.title}
              </strong>
              ? This action removes all associated timeline topics, learning outcomes, and knowledge
              dimensions from the database.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingWorkshop(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
