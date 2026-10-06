import React, { useState, useMemo, useEffect } from 'react';
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
  ListChecks,
  Lock,
  FileText,
  AlertTriangle,
  Link as LinkIcon,
  Check,
  X,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { workshopService } from '../../services/workshopService';
import { seriesService } from '../../services/seriesService';
import { Workshop, WorkshopSeries, WorkshopStatus, UserProfile } from '../../types';
import { calculateWorkshopProgress } from '../../utils/workshopProgress';
import {
  isUserAssignedToWorkshop,
  isSeriesAssignedToDeveloper,
  canUserModifyWorkshop as checkCanUserModifyWorkshop,
  canUserViewFullWorkshopContent,
  isWorkshopOrphan,
  isUserLeadOfSeries,
  isWorkshopInSeries,
} from '../../utils/workshopPermissions';
import { WorkshopProgressModal } from './WorkshopProgressModal';
import { WorkshopQuickOverviewModal } from './WorkshopQuickOverviewModal';

interface WorkshopListProps {
  workshops: Workshop[];
  series: WorkshopSeries[];
  users: UserProfile[];
  onOpenCreateWorkshop: () => void;
  onSelectWorkshop: (workshop: Workshop, mode: 'edit' | 'preview') => void;
  viewMode?: 'my' | 'all';
  onWorkshopsUpdated?: (workshops: Workshop[]) => void;
}

export const WorkshopList: React.FC<WorkshopListProps> = ({
  workshops = [],
  series = [],
  users = [],
  onOpenCreateWorkshop,
  onSelectWorkshop,
  viewMode = 'all',
  onWorkshopsUpdated,
}) => {
  const {
    userProfile,
    isAdmin,
    isProgramAdmin,
    isWorkshopLead,
    isAcademicAffairs,
    isProjectLead,
    canInitiateWorkshop,
    canChangeStatus,
  } = useAuth();
  const { success, error, info } = useToast();

  const isElevatedRole = isAdmin || isWorkshopLead || isAcademicAffairs || isProjectLead;

  const safeWorkshops = Array.isArray(workshops) ? workshops : [];
  const safeSeries = Array.isArray(series) ? series : [];
  const safeUsers = Array.isArray(users) ? users : [];

  // Local optimistic state for immediate zero-latency workshop deletion/updates
  const [localWorkshops, setLocalWorkshops] = useState<Workshop[]>(safeWorkshops);

  useEffect(() => {
    setLocalWorkshops(safeWorkshops);
  }, [workshops]);

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
  const [inspectingProgressWorkshop, setInspectingProgressWorkshop] = useState<Workshop | null>(null);
  const [overviewWorkshop, setOverviewWorkshop] = useState<Workshop | null>(null);

  // Assign to Series Modal state (for orphan workshops)
  const [reassigningWorkshop, setReassigningWorkshop] = useState<Workshop | null>(null);
  const [targetSeriesIdForAssign, setTargetSeriesIdForAssign] = useState<string>('');
  const [isAssigningSeries, setIsAssigningSeries] = useState(false);

  const userId = userProfile?.id || '';

  // Base list: Developers see their own assigned or created workshops; elevated roles see all
  const baseList = useMemo(() => {
    if (!isElevatedRole) {
      return localWorkshops.filter((w) => isUserAssignedToWorkshop(w, userProfile));
    }
    return localWorkshops;
  }, [localWorkshops, isElevatedRole, userProfile]);

  // Series available to filter
  const availableSeries = useMemo(() => {
    if (isElevatedRole) return safeSeries;
    return safeSeries.filter(
      (s) => s.createdBy === userId || isSeriesAssignedToDeveloper(s, localWorkshops, userProfile)
    );
  }, [isElevatedRole, safeSeries, localWorkshops, userId, userProfile]);

  // Orphan checker
  const checkIsOrphan = (w: Workshop): boolean => {
    return isWorkshopOrphan(w, safeSeries);
  };

  // Determine whether user can delete this specific workshop
  const canUserDeleteWorkshop = (w: Workshop): boolean => {
    if (!userProfile) return false;

    // 1. Program Administrator can delete any workshop
    if (userProfile.role === 'administrator') return true;

    // 2. Author / Creator of the workshop can delete
    if (w.createdBy && w.createdBy === userId) return true;

    // 3. Workshop Lead:
    if (userProfile.role === 'workshop_lead') {
      // a) Can delete orphan workshops (series deleted or missing)
      if (checkIsOrphan(w)) {
        return true;
      }

      // b) Can delete workshops in series they lead
      const parentSeries = safeSeries.find((s) => isWorkshopInSeries(w, s));
      if (parentSeries && isUserLeadOfSeries(parentSeries, userProfile)) {
        return true;
      }

      // c) Also check if any active series led by user matches this workshop
      const isLeadOfAnyMatchingSeries = safeSeries.some(
        (s) => isWorkshopInSeries(w, s) && isUserLeadOfSeries(s, userProfile)
      );
      if (isLeadOfAnyMatchingSeries) {
        return true;
      }

      // d) If user is assigned developer/instructor on this workshop
      if (isUserAssignedToWorkshop(w, userProfile)) {
        return true;
      }
    }

    return false;
  };

  // Determine whether user can modify / edit this workshop
  const canUserModify = (w: Workshop): boolean => {
    return checkCanUserModifyWorkshop(w, userProfile, safeSeries);
  };

  const canViewFull = (w: Workshop): boolean => {
    return canUserViewFullWorkshopContent(w, userProfile, safeSeries);
  };

  // Count orphan workshops
  const orphanCount = useMemo(() => {
    return localWorkshops.filter((w) => checkIsOrphan(w)).length;
  }, [localWorkshops, safeSeries]);

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

        // Series filter (including special 'orphan' filter)
        if (selectedSeries === 'orphan') {
          if (!checkIsOrphan(w)) return false;
        } else if (selectedSeries !== 'all' && w.seriesId !== selectedSeries) {
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
        // Prioritize orphan workshops at top if in warning view
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
  }, [baseList, searchTerm, selectedSeries, selectedDeveloper, selectedStatus, sortBy, sortOrder, safeSeries]);

  // Execute workshop deletion with optimistic UI update
  const handleDelete = async () => {
    if (!deletingWorkshop?.id || !userProfile) return;
    const targetId = deletingWorkshop.id;
    const targetTitle = `${deletingWorkshop.prefix} ${deletingWorkshop.code}`;

    setIsDeleting(true);
    try {
      // 1. Instant optimistic local state update
      const remaining = localWorkshops.filter((w) => w.id !== targetId);
      setLocalWorkshops(remaining);
      if (onWorkshopsUpdated) {
        onWorkshopsUpdated(remaining);
      }
      setDeletingWorkshop(null);

      // 2. Persist to storage and Firestore
      await workshopService.deleteWorkshop(targetId);
      success('Workshop Deleted', `${targetTitle} was permanently removed.`);
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

  // Open Reassign Modal for Orphan Workshop
  const handleOpenAssignSeriesModal = (workshop: Workshop) => {
    setReassigningWorkshop(workshop);
    setTargetSeriesIdForAssign(safeSeries[0]?.id || '');
  };

  // Save Assignment of Workshop to Series
  const handleConfirmAssignToSeries = async () => {
    if (!reassigningWorkshop || !reassigningWorkshop.id || !targetSeriesIdForAssign || !userProfile) return;

    const chosenSeries = safeSeries.find((s) => s.id === targetSeriesIdForAssign);
    if (!chosenSeries) {
      error('Selection Error', 'Please select a valid series track.');
      return;
    }

    setIsAssigningSeries(true);
    try {
      const updates: Partial<Workshop> = {
        seriesId: chosenSeries.id,
        seriesName: chosenSeries.name,
        prefix: chosenSeries.prefix || reassigningWorkshop.prefix,
        updatedAt: new Date().toISOString(),
      };

      const updatedWorkshop: Workshop = {
        ...reassigningWorkshop,
        ...updates,
      };

      // Optimistic update
      const updatedList = localWorkshops.map((w) =>
        w.id === reassigningWorkshop.id ? updatedWorkshop : w
      );
      setLocalWorkshops(updatedList);
      if (onWorkshopsUpdated) {
        onWorkshopsUpdated(updatedList);
      }

      // Persist workshop update
      await workshopService.updateWorkshop(reassigningWorkshop.id, updates, userProfile);

      // Also ensure workshop ID is linked in series workshopIds
      if (chosenSeries.id && Array.isArray(chosenSeries.workshopIds) && !chosenSeries.workshopIds.includes(reassigningWorkshop.id)) {
        await seriesService.updateSeries(
          chosenSeries.id,
          { workshopIds: [...chosenSeries.workshopIds, reassigningWorkshop.id] },
          userProfile
        );
      }

      success(
        'Series Assigned',
        `"${reassigningWorkshop.prefix} ${reassigningWorkshop.code}" is now assigned to "${chosenSeries.name}".`
      );
      setReassigningWorkshop(null);
    } catch (err: any) {
      error('Assignment Failed', err.message || 'Could not assign workshop to series.');
    } finally {
      setIsAssigningSeries(false);
    }
  };

  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    'In Development': { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300' },
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
              : 'Workshops you have created, lead, or are collaborating on as an instructor/developer'}
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

          {canInitiateWorkshop && (
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

      {/* Orphan Workshop Notice Banner for Leads & Admins */}
      {orphanCount > 0 && (isWorkshopLead || isAdmin) && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-200/80 text-amber-900 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 text-amber-800" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-amber-900">
                  {orphanCount} Orphan Workshop{orphanCount > 1 ? 's' : ''} Detected
                </span>
                <span className="px-2 py-0.2 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black uppercase">
                  Action Required
                </span>
              </div>
              <p className="text-xs text-amber-900/80 mt-0.5">
                Workshops whose series were deleted or not assigned are listed with a yellow warning. As a Workshop Lead, you can assign them to an active series or delete them.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={() => setSelectedSeries('orphan')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedSeries === 'orphan'
                  ? 'bg-amber-900 text-white shadow-xs'
                  : 'bg-white hover:bg-amber-100 text-amber-900 border border-amber-300'
              }`}
            >
              View Orphan Workshops
            </button>
            {selectedSeries === 'orphan' && (
              <button
                type="button"
                onClick={() => setSelectedSeries('all')}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 cursor-pointer"
              >
                Clear Filter
              </button>
            )}
          </div>
        </div>
      )}

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
          <div className="w-full md:w-56">
            <select
              value={selectedSeries}
              onChange={(e) => setSelectedSeries(e.target.value)}
              className={`w-full px-3 py-2 text-xs border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 ${
                selectedSeries === 'orphan'
                  ? 'border-amber-400 bg-amber-50 text-amber-950 font-bold'
                  : 'border-slate-200 text-slate-800 bg-slate-50 hover:bg-slate-100/70'
              }`}
            >
              <option value="all">
                {isAdmin ? 'All Workshop Series' : 'My Workshop Series'}
              </option>
              {orphanCount > 0 && (
                <option value="orphan" className="font-bold text-amber-800">
                  ⚠️ Orphan Workshops ({orphanCount})
                </option>
              )}
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
                Keyword: &quot;{searchTerm}&quot;
                <button onClick={() => setSearchTerm('')} className="hover:text-rose-600 font-bold ml-1 cursor-pointer">
                  ×
                </button>
              </span>
            )}
            {selectedSeries !== 'all' && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border ${
                  selectedSeries === 'orphan'
                    ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                    : 'bg-sky-50 text-sky-900 border-sky-200'
                }`}
              >
                {selectedSeries === 'orphan'
                  ? 'Orphan Workshops'
                  : `Series: ${series.find((s) => s.id === selectedSeries)?.name}`}
                <button onClick={() => setSelectedSeries('all')} className="hover:text-rose-600 font-bold ml-1 cursor-pointer">
                  ×
                </button>
              </span>
            )}
            {selectedStatus !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                Status: {selectedStatus}
                <button onClick={() => setSelectedStatus('all')} className="hover:text-rose-600 font-bold ml-1 cursor-pointer">
                  ×
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Results Count Banner */}
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
          {canInitiateWorkshop && (
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
            const isOrphan = checkIsOrphan(w);
            const canDelete = canUserDeleteWorkshop(w);
            const canModify = canUserModify(w);
            const canViewContent = canViewFull(w);

            return (
              <div
                key={w.id}
                onClick={() => {
                  if (!canViewContent) {
                    setOverviewWorkshop(w);
                  }
                }}
                className={`group bg-white rounded-2xl border shadow-2xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden ${
                  isOrphan
                    ? 'border-amber-300 ring-2 ring-amber-400/20'
                    : !canViewContent
                    ? 'border-slate-200 hover:border-slate-400 cursor-pointer'
                    : 'border-slate-200 hover:border-sky-400'
                }`}
              >
                <div>
                  {/* Card Top Banner */}
                  <div className={`p-4 border-b flex items-start justify-between gap-3 ${
                    isOrphan ? 'bg-amber-50/70 border-amber-200' : 'bg-slate-50/60 border-slate-100'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${
                        isOrphan ? 'bg-amber-600 text-white' : 'bg-[#002B49] text-white'
                      }`}>
                        <span className="text-[10px] text-amber-200 leading-none">{w.prefix}</span>
                        <span className="text-sm leading-tight">{w.code}</span>
                      </div>
                      <div>
                        <span className="text-[11px] font-extrabold text-[#002B49] tracking-wide flex items-center gap-1.5">
                          <span>{w.prefix} {w.code}</span>
                          <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-900 font-extrabold text-[9px] uppercase tracking-wider">
                            {w.level || 'Foundation'}
                          </span>
                        </span>
                        {isOrphan ? (
                          <p className="text-[10px] text-amber-800 font-bold truncate max-w-[170px] flex items-center gap-1 mt-0.5">
                            <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                            <span>Series Deleted / Unassigned</span>
                          </p>
                        ) : w.seriesName ? (
                          <p className="text-[10px] text-slate-500 font-medium truncate max-w-[170px]">
                            {w.seriesName}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${style.bg} ${style.text} ${style.border}`}
                      >
                        {w.status}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 space-y-3">
                    {/* Yellow Warning on Workshop Name for Leads & Admins */}
                    {isOrphan && (
                      <div className="p-3 rounded-xl bg-amber-50 border-2 border-amber-400 text-amber-950 space-y-2 text-xs shadow-xs">
                        <div className="flex items-center gap-1.5 font-black text-amber-900 text-xs">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>ORPHAN WORKSHOP • SERIES MISSING</span>
                        </div>
                        <p className="text-[11px] text-amber-900 leading-snug">
                          This workshop does not belong to any series track (its series was deleted or never assigned). Needs to be assigned to another series or deleted.
                        </p>
                        {(isWorkshopLead || isAdmin) && (
                          <div className="flex items-center gap-2 pt-1 border-t border-amber-200">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenAssignSeriesModal(w);
                              }}
                              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-[#002B49] hover:bg-[#003d66] text-white text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                            >
                              <Layers className="w-3.5 h-3.5 text-amber-400" />
                              <span>Assign Series</span>
                            </button>
                            {canDelete && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingWorkshop(w);
                                }}
                                className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                                title="Delete Orphan Workshop"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-start gap-1.5">
                      {isOrphan && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-400 text-amber-950 text-[10px] font-black uppercase shrink-0 mt-0.5 border border-amber-500 shadow-2xs">
                          <AlertTriangle className="w-3 h-3 text-amber-950" />
                          <span>Orphan</span>
                        </span>
                      )}
                      <h3
                        onClick={() => onSelectWorkshop(w, 'edit')}
                        className={`text-sm font-bold group-hover:text-[#002B49] transition-colors cursor-pointer line-clamp-2 leading-snug ${
                          isOrphan ? 'text-amber-950 font-extrabold' : 'text-slate-900'
                        }`}
                      >
                        {w.title}
                      </h3>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                      {w.description || 'No detailed workshop description provided yet.'}
                    </p>

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

                    {/* Assigned Developers */}
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
                    {canViewContent ? (
                      <button
                        onClick={() => onSelectWorkshop(w, 'preview')}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white hover:text-slate-900 transition-colors cursor-pointer"
                        title="Preview Document"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOverviewWorkshop(w);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition-colors cursor-pointer"
                        title="Quick Overview"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-600" />
                        <span>Overview</span>
                      </button>
                    )}

                    {/* Delete Workshop Button (Leads & Admins) - Always rendered when user has delete permission */}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingWorkshop(w);
                        }}
                        className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition-colors cursor-pointer"
                        title="Delete Workshop (with confirmation warning)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isOrphan && (isWorkshopLead || isAdmin) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenAssignSeriesModal(w);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold border border-amber-300 transition-colors cursor-pointer"
                        title="Assign to Series Track"
                      >
                        <Layers className="w-3.5 h-3.5 text-amber-700" />
                        <span>Assign</span>
                      </button>
                    )}

                    {canViewContent && (
                      <button
                        onClick={() => onSelectWorkshop(w, 'edit')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#002B49] hover:bg-[#003d66] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                      >
                        {!canModify ? (
                          <>
                            <Eye className="w-3.5 h-3.5 text-sky-300" />
                            <span>View Outline</span>
                          </>
                        ) : (
                          <>
                            <Edit className="w-3.5 h-3.5 text-amber-400" />
                            <span>Edit Outline</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Code</th>
                  <th className="py-3.5 px-4">Workshop Title</th>
                  <th className="py-3.5 px-4">Series Track</th>
                  <th className="py-3.5 px-4">Instructors</th>
                  {isElevatedRole && <th className="py-3.5 px-4">Specification Progress</th>}
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Updated</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredWorkshops.map((w) => {
                  const style = statusColors[w.status] || statusColors['In Development'];
                  const isOrphan = checkIsOrphan(w);
                  const canDelete = canUserDeleteWorkshop(w);
                  const canModify = canUserModify(w);
                  const canViewContent = canViewFull(w);

                  return (
                    <tr
                      key={w.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isOrphan ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-md text-white font-extrabold text-[11px] ${
                          isOrphan ? 'bg-amber-600' : 'bg-[#002B49]'
                        }`}>
                          {w.prefix} {w.code}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isOrphan && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-400 text-amber-950 border border-amber-500 text-[10px] font-black uppercase shadow-2xs">
                                <AlertTriangle className="w-3 h-3 text-amber-950" />
                                <span>⚠️ Orphan • Series Missing</span>
                              </span>
                            )}
                            <div
                              onClick={() => onSelectWorkshop(w, 'edit')}
                              className={`font-bold hover:text-sky-800 cursor-pointer line-clamp-1 ${
                                isOrphan ? 'text-amber-950 font-extrabold' : 'text-slate-900'
                              }`}
                            >
                              {w.title}
                            </div>
                          </div>
                          {isOrphan && (
                            <div className="text-[11px] font-medium text-amber-900 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-300 flex items-center justify-between gap-2 max-w-lg">
                              <span>⚠️ This workshop is not belonging to any series and needs to be assigned to another series or deleted.</span>
                              {(isWorkshopLead || isAdmin) && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenAssignSeriesModal(w)}
                                    className="text-[10px] font-bold text-[#002B49] bg-white px-2 py-0.5 rounded border border-amber-300 hover:bg-amber-100 cursor-pointer shadow-2xs"
                                  >
                                    Assign
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeletingWorkshop(w)}
                                    className="text-[10px] font-bold text-rose-700 bg-white px-2 py-0.5 rounded border border-rose-300 hover:bg-rose-50 cursor-pointer shadow-2xs"
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>{w.totalDurationMinutes || 120} mins</span>
                            <span>•</span>
                            <span>{w.learningOutcomes?.length || 0} LOs</span>
                            <span>•</span>
                            <span className="px-1 py-0.5 rounded bg-blue-50 text-blue-800 text-[10px] font-extrabold uppercase">
                              {w.level || 'Foundation'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        {isOrphan ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                              <AlertTriangle className="w-3 h-3 text-amber-700" />
                              <span>Series Deleted</span>
                            </span>
                            {(isWorkshopLead || isAdmin) && (
                              <button
                                type="button"
                                onClick={() => handleOpenAssignSeriesModal(w)}
                                className="text-[10px] text-[#002B49] font-bold hover:underline cursor-pointer block"
                              >
                                Assign to Series →
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="font-medium">
                            {w.seriesName || <span className="text-slate-400 italic">—</span>}
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

                      {isElevatedRole && (
                        <td className="py-3 px-4">
                          {(() => {
                            const progress = calculateWorkshopProgress(w);
                            return (
                              <div className="space-y-1 min-w-[130px]">
                                <div className="flex items-center justify-between text-[10px] font-bold">
                                  <span className={progress.percentage === 100 ? 'text-emerald-700' : 'text-slate-700'}>
                                    {progress.completedCount}/8 Done ({progress.percentage}%)
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setInspectingProgressWorkshop(w)}
                                    className="text-blue-700 hover:text-blue-900 hover:underline uppercase text-[9px] font-black cursor-pointer"
                                  >
                                    Inspect
                                  </button>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      progress.percentage === 100
                                        ? 'bg-emerald-500'
                                        : progress.percentage >= 70
                                        ? 'bg-blue-600'
                                        : 'bg-amber-500'
                                    }`}
                                    style={{ width: `${progress.percentage}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })()}
                        </td>
                      )}

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${style.bg} ${style.text} ${style.border}`}>
                          {w.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap text-[11px]">
                        {new Date(w.updatedAt || Date.now()).toLocaleDateString()}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {canViewContent ? (
                            <>
                              <button
                                onClick={() => onSelectWorkshop(w, 'preview')}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Preview Document"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {isOrphan && (isWorkshopLead || isAdmin) && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenAssignSeriesModal(w)}
                                  className="px-2 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-xs font-bold transition-colors cursor-pointer"
                                  title="Assign to Series"
                                >
                                  Assign
                                </button>
                              )}

                              <button
                                onClick={() => onSelectWorkshop(w, 'edit')}
                                className="px-2.5 py-1 rounded-lg bg-[#002B49] text-white text-xs font-semibold hover:bg-sky-900 transition-colors cursor-pointer"
                              >
                                {!canModify ? 'View' : 'Edit'}
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => setOverviewWorkshop(w)}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-semibold hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                                title="Quick Overview"
                              >
                                <FileText className="w-3.5 h-3.5 text-slate-600" />
                                <span>Overview</span>
                              </button>

                              {isOrphan && (isWorkshopLead || isAdmin) && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenAssignSeriesModal(w)}
                                  className="px-2 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-xs font-bold transition-colors cursor-pointer"
                                  title="Assign to Series"
                                >
                                  Assign
                                </button>
                              )}
                            </>
                          )}

                          {/* Delete Workshop Button (Leads & Admins) - Always rendered when user has delete permission */}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => setDeletingWorkshop(w)}
                              className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition-colors cursor-pointer"
                              title="Delete Workshop (with confirmation warning)"
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

      {/* Progress Inspector Modal */}
      {inspectingProgressWorkshop && (
        <WorkshopProgressModal
          workshop={inspectingProgressWorkshop}
          onClose={() => setInspectingProgressWorkshop(null)}
          onOpenWorkshop={onSelectWorkshop}
        />
      )}

      {/* Delete Confirmation Modal (With Explicit Warning for Leads & Admins) */}
      {deletingWorkshop && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3 text-rose-600 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Workshop Outline?</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Confirm permanent removal of this workshop outline.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Target Workshop:
              </div>
              <div className="font-extrabold text-sm text-slate-900">
                {deletingWorkshop.prefix} {deletingWorkshop.code} — {deletingWorkshop.title}
              </div>
              {deletingWorkshop.seriesName && (
                <div className="text-xs text-slate-600">
                  Series: {deletingWorkshop.seriesName}
                </div>
              )}
            </div>

            {/* Warning Details */}
            {checkIsOrphan(deletingWorkshop) ? (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs space-y-1 mt-3">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>Orphan Workshop Warning</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-900/90">
                  This workshop is orphaned because its series was deleted or missing. Deleting it will permanently remove all activities, learning outcomes, and files.
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs space-y-1 mt-3">
                <div className="font-bold flex items-center gap-1.5 text-slate-800">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>Curriculum Removal Notice</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  As a Workshop Lead, deleting this workshop will permanently remove it from this series track and university catalog.
                </p>
              </div>
            )}

            <div className="mt-5 flex items-center justify-end gap-2.5">
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
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Orphan Workshop to Series Modal */}
      {reassigningWorkshop && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5 text-[#002B49]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Assign Workshop to Series Track
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Link orphan workshop &quot;{reassigningWorkshop.prefix} {reassigningWorkshop.code}&quot; to an active sequence.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReassigningWorkshop(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                  Selected Workshop:
                </div>
                <div className="font-extrabold text-slate-900">
                  {reassigningWorkshop.prefix} {reassigningWorkshop.code} — {reassigningWorkshop.title}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Select Target Workshop Series Track:
                </label>
                {safeSeries.length === 0 ? (
                  <p className="text-xs text-slate-400 italic p-4 text-center border border-dashed rounded-xl">
                    No active series tracks available. Please create a series first.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {safeSeries.map((s) => {
                      const isSelected = targetSeriesIdForAssign === s.id;
                      const isMyLead = isUserLeadOfSeries(s, userProfile);
                      return (
                        <div
                          key={s.id}
                          onClick={() => setTargetSeriesIdForAssign(s.id || '')}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                            isSelected
                              ? 'bg-sky-50 border-[#002B49] shadow-2xs ring-1 ring-[#002B49]/20'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 transition-colors ${
                              isSelected
                                ? 'bg-[#002B49] border-[#002B49] text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-1.5 py-0.2 rounded bg-[#002B49] text-white font-extrabold text-[10px]">
                                {s.prefix || 'UCW'}
                              </span>
                              <span className="text-xs font-bold text-slate-900 truncate">
                                {s.name}
                              </span>
                              {isMyLead && (
                                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                                  Your Lead Track
                                </span>
                              )}
                            </div>
                            {s.coreFocus && (
                              <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                {s.coreFocus}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isAssigningSeries}
                onClick={() => setReassigningWorkshop(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isAssigningSeries || !targetSeriesIdForAssign}
                onClick={handleConfirmAssignToSeries}
                className="px-4 py-2 text-xs font-bold text-white bg-[#002B49] hover:bg-[#003d66] rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isAssigningSeries ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Assigning...</span>
                  </>
                ) : (
                  <>
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    <span>Confirm Assignment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workshop Quick Overview Modal for restricted outlines */}
      {overviewWorkshop && (
        <WorkshopQuickOverviewModal
          workshop={overviewWorkshop}
          seriesList={safeSeries}
          onClose={() => setOverviewWorkshop(null)}
        />
      )}
    </div>
  );
};
